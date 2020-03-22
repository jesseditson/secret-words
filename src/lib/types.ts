// DB Types

export enum Team {
    NONE = "None",
    BLUE = "Blue",
    RED = "Red",
    DEATH = "Death"
}

export enum GameState {
    NEW = "New",
    STARTED = "Started",
    FINISHED = "Finished"
}

export interface Game {
    _id: string
    creatorId: string
    name: string
    playerIds: string[]
    blueIds: string[]
    redIds: string[]
    blueHinter?: string
    redHinter?: string
    state: GameState
    turn: Team
}

export interface User {
    _id: string
    name: string
}

export interface Session {
    _id: string // same as user ID
    currentGameId?: string
}

export interface Tile {
    _id: string
    gameId: string
    word: string
    x: number
    y: number
    guessedBy?: string
    team: Team
}

// App Types
export interface AppState {
    initialized: boolean
    games: Game[]
    currentUser?: User
    currentGame?: Game
    currentPlayers?: Map<string, User>
    currentGameTiles?: Tile[]
}
