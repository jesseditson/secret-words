import PouchDB from "pouchdb"
import { GameMessageEvent, Op, AppMessage } from "../lib/messages"
import {
    Game,
    User,
    Team,
    Session,
    AppState,
    Tile,
    GameState
} from "../lib/types"
import { v4 as uuid } from "uuid"
import dictionary from "../data/dictionary.json"

// Config
const DB_PREFIX = "secret-words"
const REMOTE_URL = process.env.REMOTE_URL
if (!REMOTE_URL) {
    throw new Error("REMOTE_URL is required")
}
const ctx: Worker = self as any

// Setup DBs
const gameDb = new PouchDB(`${DB_PREFIX}:games`)
gameDb.sync(`${REMOTE_URL}/games`)
const tileDb = new PouchDB(`${DB_PREFIX}:tiles`)
tileDb.sync(`${REMOTE_URL}/tiles`)
const userDb = new PouchDB(`${DB_PREFIX}:users`)
userDb.sync(`${REMOTE_URL}/users`)
const sessionDb = new PouchDB(`${DB_PREFIX}:sessions`)
sessionDb.sync(`${REMOTE_URL}/sessions`)

// Globals
const changeListeners: Map<string, PouchDB.Core.Changes<any>> = new Map()

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
    const changeOpts = { since: "now", live: true, include_docs: true }
    const refreshState = async () => {
        const newState = await getState(userId)
        ctx.postMessage({ op: Op.UPDATE_STATE, data: newState })
    }
    // User
    if (userId && lastState.currentUser?._id !== userId) {
        changeListeners.get("user")?.cancel()
        changeListeners.set(
            "user",
            userDb
                .changes({ ...changeOpts, doc_ids: [userId] })
                .on("change", change =>
                    ctx.postMessage({ op: Op.USER_CHANGED, data: change.doc })
                )
        )
    }
    // Session
    const session = await allow404(sessionDb.get<Session>(userId))
    if (session && !changeListeners.has("session")) {
        changeListeners.set(
            "session",
            sessionDb
                .changes({
                    ...changeOpts,
                    doc_ids: [session._id]
                })
                .on("change", refreshState)
        )
    }
    let currentGame: Game | undefined
    let currentGameTiles: Tile[] = []
    const currentPlayers: Map<string, User> = new Map()
    if (session?.currentGameId) {
        const [cGame, cTiles] = await Promise.all([
            gameDb.get<Game>(session.currentGameId),
            allDocs(
                tileDb.allDocs<Tile>({
                    include_docs: true,
                    keys: tileList(session.currentGameId).map(({ _id }) => _id)
                })
            )
        ])
        currentGame = cGame
        currentGameTiles = cTiles
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
    // Cancel old and add new listeners when game ID changes
    if (currentGame?._id !== lastState.currentGame?._id) {
        changeListeners.get("currentGame")?.cancel()
        changeListeners.get("currentGamePlayers")?.cancel()
        changeListeners.get("currentGameTiles")?.cancel()
        if (session?.currentGameId) {
            changeListeners.set(
                "currentGame",
                gameDb
                    .changes({
                        ...changeOpts,
                        doc_ids: [session.currentGameId]
                    })
                    .on("change", refreshState)
            )
        }
        if (currentGame) {
            changeListeners.set(
                "currentGamePlayers",
                userDb
                    .changes({ ...changeOpts, doc_ids: currentGame.playerIds })
                    .on("change", refreshState)
            )
            changeListeners.set(
                "currentGameTiles",
                tileDb
                    .changes({
                        ...changeOpts,
                        doc_ids: tileList(currentGame._id).map(({ _id }) => _id)
                    })
                    .on("change", refreshState)
            )
        }
    }
    const nextState = {
        games: games || [],
        currentUser: user,
        currentGame,
        currentGameTiles,
        currentPlayers,
        initialized: true
    }
    lastState = nextState
    return nextState
}

// Operation handlers
let initialized = false
const initialize = async (userId: string) => {
    if (initialized) {
        throw new Error("Double Initialized")
    }
    const changeOpts = { since: "now", live: true, include_docs: true }
    // TODO: won't scale
    changeListeners.set(
        "games",
        gameDb
            .changes(changeOpts)
            .on("change", change =>
                ctx.postMessage({ op: Op.GAME_CHANGED, data: change.doc })
            )
    )
    const newState = await getState(userId)
    ctx.postMessage({ op: Op.UPDATE_STATE, data: newState })
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
            turn
        })
    ])
}
const deleteGame = async (gameId: string, userId: string) => {
    const game = await allow404(gameDb.get<Game>(gameId))
    if (!game || game?.creatorId !== userId) {
        return
    }
    return gameDb.remove(game)
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
    return sessionDb.put<Session>({
        ...session,
        currentGameId: gameId
    })
}
const hideGame = async (userId: string) => {
    const session = await allow404(sessionDb.get<Session>(userId))
    if (!session) {
        return
    }
    return sessionDb.put<Session>({
        ...session,
        currentGameId: undefined
    })
}
const changeTeam = async (gameId: string, userId: string, team: Team) => {
    const game = await gameDb.get<Game>(gameId)
    if (team === Team.BLUE) {
        game.blueIds.push(userId)
        game.redIds = game.redIds.filter(id => id !== userId)
    } else if (team === Team.RED) {
        game.redIds.push(userId)
        game.blueIds = game.blueIds.filter(id => id !== userId)
    } else if (team === Team.NONE) {
        game.redIds = game.redIds.filter(id => id !== userId)
        game.blueIds = game.blueIds.filter(id => id !== userId)
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

// Route the messages to the handlers
const handleMessage = async (
    e: GameMessageEvent<any>
): Promise<AppMessage | void> => {
    const { data, op, userId } = e.data
    console.info(op, data)
    switch (op) {
        case Op.INITIALIZE:
            initialize(userId)
            break
        case Op.CREATE_USER:
            await createUser({ _id: userId, ...data })
            break
        case Op.CREATE_GAME:
            await createGame(data.name, userId)
            break
        case Op.CREATE_GAME:
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
        case Op.CHANGE_TEAM:
            await changeTeam(data.gameId, data.playerId, data.team)
            break
        case Op.START_GAME:
            await startGame(data.gameId)
            break
    }
}
ctx.onmessage = handleMessage
