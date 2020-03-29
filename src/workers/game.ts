import PouchDB from "pouchdb"
import { GameMessageEvent, Op, AppMessage } from "../lib/messages"
import {
    Game,
    User,
    Team,
    Session,
    AppState,
    Tile,
    GameState,
    VideoChatInfo
} from "../lib/types"
import { v4 as uuid } from "uuid"
import dictionary from "../data/dictionary.json"
import getLogger from "debug"
import { getWinner } from "../lib/util"
const debug = getLogger("secret-words:game")

// Debugging
if (process.env.NODE_ENV !== "production") {
    // @ts-ignore
    import("pouchdb-debug").then(pouchdbDebug => {
        PouchDB.plugin(pouchdbDebug.default)
        // PouchDB.debug.enable("*")
    })
}

// Config
const DB_PREFIX = "secret-words"
const REMOTE_URL = process.env.REMOTE_URL
if (!REMOTE_URL) {
    throw new Error("REMOTE_URL is required")
}
const ctx: Worker = self as any

// Setup DBs - we only set these up to pull live,
// since we know when to push (after an action)
const gameDb = new PouchDB(`${DB_PREFIX}:games`)
const tileDb = new PouchDB(`${DB_PREFIX}:tiles`)
const userDb = new PouchDB(`${DB_PREFIX}:users`)
const sessionDb = new PouchDB(`${DB_PREFIX}:sessions`)

// Helpers
const allow404 = <T = any>(op: Promise<T>): Promise<T | undefined> => {
    return op.catch(e => {
        if (e.status === 404) {
            return undefined
        }
        throw e
    })
}
const allDocs = <T = any>(op: Promise<PouchDB.Core.AllDocsResponse<T>>) => {
    return op.then(({ rows }) => rows.filter(r => !!r.doc).map(r => r.doc!))
}
function* wordGenerator(): Generator<string> {
    let list: string[] = []
    while (true) {
        if (list.length === 0) {
            list = [...dictionary.words]
        }
        yield list.splice(Math.floor(Math.random() * list.length), 1)[0]
    }
}
function* teamAssigner(firstTeam: Team): Generator<Team> {
    let list: Team[] = [Team.DEATH, firstTeam]
    for (let i = 0; i < 8; i++) {
        list.push(Team.RED)
        list.push(Team.BLUE)
        if (i < 7) {
            list.push(Team.NONE)
        }
    }
    while (true) {
        yield list.splice(Math.floor(Math.random() * list.length), 1)[0]
    }
}
const tileList = (gameId: string) => {
    const tileIds: { _id: string; x: number; y: number }[] = []
    for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
            tileIds.push({ _id: `${gameId}:${x}-${y}`, x, y })
        }
    }
    return tileIds
}
const allTiles = (gameId: string) =>
    allDocs(
        tileDb.allDocs<Tile>({
            include_docs: true,
            keys: tileList(gameId).map(({ _id }) => _id)
        })
    )

// State management
let lastState: AppState = { games: [], initialized: false }
const getState = async (userId: string): Promise<AppState> => {
    const [games, user] = await Promise.all([
        // TODO: bad idea, won't scale
        allDocs(
            gameDb.allDocs<Game>({ include_docs: true })
        ),
        allow404(userDb.get<User>(userId))
    ])
    // Session
    const session = await allow404(sessionDb.get<Session>(userId))
    let currentGame: Game | undefined
    let currentTeam: Team | undefined
    let currentGameTiles: Tile[] = []
    const currentPlayers: Map<string, User> = new Map()
    if (session?.currentGameId) {
        try {
            const [cGame, cTiles] = await Promise.all([
                gameDb.get<Game>(session.currentGameId),
                allTiles(session.currentGameId)
            ])
            currentGame = cGame
            currentGameTiles = cTiles
        } catch (e) {
            console.log("current game no longer exists...")
        }
    }
    if (currentGame) {
        currentTeam = currentGame.blueIds.includes(userId)
            ? Team.BLUE
            : currentGame.redIds.includes(userId)
            ? Team.RED
            : Team.NONE
        const { rows: players } = await userDb.allDocs<User>({
            include_docs: true,
            keys: currentGame.playerIds
        })
        for (const { doc: player } of players) {
            if (player) {
                currentPlayers.set(player._id, player)
            }
        }
    }
    let videoChatInfo: VideoChatInfo | undefined = undefined
    if (user && user.activeTime && currentPlayers) {
        // Computed props
        const peerIds: string[] = []
        const initiatorMap: Map<string, boolean> = new Map()
        const isInitiator = (peer: User) => {
            // Just compare IDs since that'll be stable across un-synced nodes
            return user._id < peer._id
        }
        // Create a list of all active users and a topology of who will initiate
        currentPlayers.forEach(player => {
            if (player._id !== userId && player.activeTime) {
                peerIds.push(player._id)
                initiatorMap.set(player._id, isInitiator(player))
            }
        })
        videoChatInfo = {
            userId: user._id,
            peerIds,
            initiatorMap
        }
    }
    const nextState = {
        games: games || [],
        currentUser: user,
        currentTeam,
        currentGame,
        currentGameTiles,
        currentPlayers,
        initialized: true,
        videoChatInfo
    }
    lastState = nextState
    return nextState
}

// Operation handlers
let initialized = false
const initialize = (userId: string) => {
    if (initialized) {
        throw new Error("Double Initialized")
    }
    const updateState = (event: string) => async () => {
        const newState = await getState(userId)
        console.log(`[${event}]`)
        debug(`[${event}] update state:`, newState)
        ctx.postMessage({ op: Op.UPDATE_STATE, data: newState })
    }
    // setInterval(updateState("poll"), 5000)
    gameDb
        .sync(`${REMOTE_URL}/games`, { live: true, retry: true })
        .on("change", updateState("sync-games"))
    tileDb
        .sync(`${REMOTE_URL}/tiles`, { live: true, retry: true })
        .on("change", updateState("sync-tiles"))
    userDb
        .sync(`${REMOTE_URL}/users`, { live: true, retry: true })
        .on("change", updateState("sync-users"))
    sessionDb
        .sync(`${REMOTE_URL}/sessions`, { live: true, retry: true })
        .on("change", updateState("sync-sessions"))
}
const createUser = async ({ _id, name }: { _id: string; name: string }) => {
    await sessionDb.put<Session>({ _id })
    await userDb.put<User>({ _id, name })
    const newState = await getState(_id)
    ctx.postMessage({ op: Op.UPDATE_STATE, data: newState })
}
const createGame = (name: string, creatorId: string) => {
    const gameId = uuid()
    const turn = Math.random() > 0.5 ? Team.RED : Team.BLUE
    const wordGen = wordGenerator()
    const teamGen = teamAssigner(turn)
    return Promise.all([
        tileDb.bulkDocs<Tile>(
            tileList(gameId).map(tile => ({
                ...tile,
                gameId,
                word: wordGen.next().value,
                team: teamGen.next().value
            }))
        ),
        gameDb.put<Game>({
            _id: gameId,
            creatorId,
            name,
            state: GameState.NEW,
            playerIds: [],
            blueIds: [],
            redIds: [],
            isGuessing: false,
            guessesRemaining: 0,
            turn
        })
    ])
}
const deleteGame = async (gameId: string, userId: string) => {
    const game = await allow404(gameDb.get<Game>(gameId))
    if (!game || game?.creatorId !== userId) {
        return
    }
    const tiles = await allTiles(game._id)
    return await Promise.all([
        tileDb.bulkDocs<Tile>(
            tiles.map(tile => ({
                ...tile,
                _deleted: true
            }))
        ),
        gameDb.put<Game>({
            ...game,
            _deleted: true
        })
    ])
}
const joinGame = async (gameId: string, userId: string) => {
    const game = await gameDb.get<Game>(gameId)
    if (game.playerIds.includes(userId)) {
        return
    }
    game.playerIds.push(userId)
    return gameDb.put<Game>({
        ...game,
        playerIds: game.playerIds
    })
}
const showGame = async (gameId: string, userId: string) => {
    const session = await sessionDb.get<Session>(userId)
    if (gameId !== session.currentGameId) {
        return sessionDb.put<Session>({
            ...session,
            currentGameId: gameId
        })
    }
}
const hideGame = async (userId: string) => {
    const session = await allow404(sessionDb.get<Session>(userId))
    if (!session) {
        return
    }
    if (session.currentGameId) {
        return sessionDb.put<Session>({
            ...session,
            currentGameId: undefined
        })
    }
}
const changeTeam = async (gameId: string, userId: string, team: Team) => {
    const game = await gameDb.get<Game>(gameId)
    if (team === Team.BLUE) {
        if (game.blueIds.length === 0) {
            game.blueHinter = userId
        }
        game.blueIds.push(userId)
        game.redIds = game.redIds.filter(id => id !== userId)
        if (game.redHinter === userId) {
            const rCount = game.redIds.length
            game.redHinter = rCount ? game.redIds[rCount - 1] : undefined
        }
    } else if (team === Team.RED) {
        if (game.redIds.length === 0) {
            game.redHinter = userId
        }
        game.redIds.push(userId)
        game.blueIds = game.blueIds.filter(id => id !== userId)
        if (game.blueHinter === userId) {
            const bCount = game.blueIds.length
            game.blueHinter = bCount ? game.blueIds[bCount - 1] : undefined
        }
    } else if (team === Team.NONE) {
        game.redIds = game.redIds.filter(id => id !== userId)
        game.blueIds = game.blueIds.filter(id => id !== userId)
        if (game.redHinter && !game.redIds.includes(game.redHinter)) {
            const rCount = game.redIds.length
            game.redHinter = rCount ? game.redIds[rCount - 1] : undefined
        }
        if (game.blueHinter && !game.blueIds.includes(game.blueHinter)) {
            const bCount = game.blueIds.length
            game.blueHinter = bCount ? game.blueIds[bCount - 1] : undefined
        }
    }
    return gameDb.put<Game>({
        ...game,
        blueIds: game.blueIds,
        redIds: game.redIds
    })
}
const startGame = async (gameId: string) => {
    const game = await gameDb.get<Game>(gameId)
    return gameDb.put<Game>({
        ...game,
        state: GameState.STARTED
    })
}
const rerollBoard = async (gameId: string) => {
    const [tiles, game] = await Promise.all([
        allTiles(gameId),
        gameDb.get<Game>(gameId)
    ])
    const wordGen = wordGenerator()
    const teamGen = teamAssigner(game.turn)
    return tileDb.bulkDocs<Tile>(
        tiles.map(tile => ({
            ...tile,
            gameId,
            word: wordGen.next().value,
            team: teamGen.next().value
        }))
    )
}
const setGuessCount = async (gameId: string, count: number) => {
    const game = await gameDb.get<Game>(gameId)
    return gameDb.put<Game>({
        ...game,
        guessesRemaining: count + 1,
        isGuessing: true
    })
}
const guessTile = async (gameId: string, userId: string, tileId: string) => {
    const [tiles, game] = await Promise.all([
        allTiles(gameId),
        gameDb.get<Game>(gameId)
    ])
    const tileIdx = tiles.findIndex(t => t._id === tileId)
    const tile = tiles[tileIdx]
    const userTeam = game.blueIds.includes(userId)
        ? Team.BLUE
        : game.redIds.includes(userId)
        ? Team.RED
        : Team.NONE
    if (!tile || userTeam === Team.NONE) {
        return
    }
    tile.guessedBy = userTeam
    tiles[tileIdx] = tile
    const winner = getWinner(tiles)
    if (winner !== Team.NONE) {
        // Guessed all tiles or death tile. End the game
        game.state = GameState.FINISHED
    } else if (userTeam !== tile.team || game.guessesRemaining === 1) {
        // Guessed the wrong team or the last guess, switch turns
        game.turn = game.turn === Team.RED ? Team.BLUE : Team.RED
        game.isGuessing = false
    } else {
        // Guessed right and have at least one guess remaining.
        // Allow another guess
        game.guessesRemaining--
    }
    return Promise.all([gameDb.put<Game>(game), tileDb.put<Tile>(tile)])
}
const finishGuessing = async (gameId: string) => {
    const game = await gameDb.get<Game>(gameId)
    return gameDb.put<Game>({
        ...game,
        turn: game.turn === Team.RED ? Team.BLUE : Team.RED,
        isGuessing: false
    })
}

// Session Management
const ACTIVE_TIMEOUT = 500
const ACTIVE_CHECK_INTERVAL = 3000
const userCheckIntervals: Map<string, number> = new Map()
const awaitingActiveResponse: Set<string> = new Set()
const activeHandler = async (userId: string) => {
    const user = await userDb.get<User>(userId)
    userCheckIntervals.set(
        userId,
        // This `self` is ugly but node types change this signature in global scope.
        // Preferable: ignore node types, but not sure how.
        self.setInterval(() => checkUserActive(userId), ACTIVE_CHECK_INTERVAL)
    )
    return userDb.put<User>({
        ...user,
        activeTime: new Date().toISOString()
    })
}
const setUserInactive = async (userId: string) => {
    const user = await userDb.get<User>(userId)
    clearTimeout(userCheckIntervals.get(userId))
    userCheckIntervals.delete(userId)
    return userDb.put<User>({
        ...user,
        activeTime: null
    })
}
// TODO: does this matter? Aren't the workers going to get destroyed if the user closes the page?
const respondUserActiveHandler = (userId: string) => {
    awaitingActiveResponse.delete(userId)
}
const checkUserActive = (userId: string) => {
    awaitingActiveResponse.add(userId)
    ctx.postMessage({ op: Op.ACTIVE_PING })
    setTimeout(async () => {
        if (awaitingActiveResponse.has(userId)) {
            // did not respond in time, set user to inactive
            setUserInactive(userId)
        }
    }, ACTIVE_TIMEOUT)
}

// Route the messages to the handlers
const handleMessage = async (
    e: GameMessageEvent<any>
): Promise<AppMessage | void> => {
    const { data, op, userId } = e.data
    debug(op, data)
    switch (op) {
        case Op.INITIALIZE:
            initialize(userId)
            await activeHandler(userId)
            break
        case Op.CREATE_USER:
            await createUser({ _id: userId, ...data })
            break
        case Op.CREATE_GAME:
            await createGame(data.name, userId)
            break
        case Op.DELETE_GAME:
            await deleteGame(data.gameId, userId)
            break
        case Op.JOIN_GAME:
            await joinGame(data.gameId, userId)
            await showGame(data.gameId, userId)
            break
        case Op.SHOW_GAME:
            await showGame(data.gameId, userId)
            break
        case Op.HIDE_GAME:
            await hideGame(userId)
            break
        case Op.DELETE_GAME:
            await deleteGame(data.gameId, userId)
            break
        case Op.CHANGE_TEAM:
            await changeTeam(data.gameId, data.playerId, data.team)
            break
        case Op.REROLL_BOARD:
            await rerollBoard(data.gameId)
            break
        case Op.START_GAME:
            await startGame(data.gameId)
            break
        case Op.SET_GUESS_COUNT:
            await setGuessCount(data.gameId, data.count)
            break
        case Op.GUESS_TILE:
            await guessTile(data.gameId, userId, data.tileId)
            break
        case Op.FINISH_GUESSING:
            await finishGuessing(data.gameId)
            break
        // Session Management Messages
        // These do not trigger state updates
        case Op.BECOME_INACTIVE:
            await setUserInactive(userId)
            return
        case Op.ACTIVE_RESPOND:
            await respondUserActiveHandler(userId)
            return
    }
    const newState = await getState(userId)
    ctx.postMessage({ op: Op.UPDATE_STATE, data: newState })
}
ctx.onmessage = handleMessage
