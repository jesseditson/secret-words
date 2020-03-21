import PouchDB from "pouchdb"
import { GameMessageEvent, Op, AppMessage, GameMessage } from "../lib/messages"
import { Game, User } from "../lib/types"
import { v4 as uuid } from "uuid"

// Config
const DB_PREFIX = "secret-words"
const ctx: Worker = self as any

// Setup DBs
const gamesDb = new PouchDB(`${DB_PREFIX}:games`)
const userDb = new PouchDB(`${DB_PREFIX}:users`)

// Operation handlers
const listGames = async (): Promise<Game[]> => {
    const { rows } = await gamesDb.allDocs<Game>({ include_docs: true })
    return rows.filter(r => !!r.doc).map(r => r.doc!)
}
let initialized = false
const initialize = async (
    userId: string
): Promise<{ games: Game[]; currentUser?: User; initialized: boolean }> => {
    if (initialized) {
        throw new Error("Double Initialized")
    }
    const [games, user] = await Promise.all([
        listGames(),
        userDb.get<User>(userId).catch(e => {
            if (e.status === 404) {
                return undefined
            }
            throw e
        })
    ])
    const options = { live: true, include_docs: true }
    gamesDb.changes(options).on("change", change => {
        ctx.postMessage({ op: Op.GAME_CHANGED, data: change.doc })
    })
    userDb.changes(options).on("change", change => {
        ctx.postMessage({ op: Op.USER_CHANGED, data: change.doc })
    })
    return { games: games || [], currentUser: user, initialized: true }
}
const createGame = async ({ name }: { name: string }) => {
    gamesDb.put({ _id: uuid(), name })
}
const createUser = async ({ _id, name }: { _id: string; name: string }) => {
    userDb.put({ _id, name })
}

// Route the messages to the handlers
const handleMessage = async (
    e: GameMessageEvent<any>
): Promise<AppMessage | void> => {
    const { data, op, userId } = e.data
    console.log(userId, op, data)
    switch (op) {
        case Op.INITIALIZE: {
            const data = await initialize(userId)
            return { op: Op.INITIALIZE, data }
        }
        case Op.CREATE_USER: {
            await createUser({ _id: userId, ...data })
            return
        }
        case Op.CREATE_GAME: {
            await createGame(data)
            return
        }
    }
}

// Abstract the main API so we have a nice async thing
ctx.onmessage = (e: GameMessageEvent<GameMessage>) => {
    handleMessage(e).then(msg => {
        if (msg) {
            ctx.postMessage(msg)
        }
    })
}
