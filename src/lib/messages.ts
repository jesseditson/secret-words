export enum Op {
    UNKNOWN = "Unknown",
    CREATE_USER = "Create User",
    INITIALIZE = "Initialize",
    UPDATE_STATE = "Update State",
    CREATE_GAME = "Create Game",
    DELETE_GAME = "Delete Game",
    JOIN_GAME = "Join Game",
    SHOW_GAME = "Show Game",
    HIDE_GAME = "Hide Game",
    CHANGE_TEAM = "Change Team",
    MAKE_HINTER = "Make Hinter",
    START_GAME = "Start Game",
    SET_GUESS_COUNT = "Set Guess Count",
    GUESS_TILE = "Guess Tile",
    FINISH_GUESSING = "Finish Guessing",
    REROLL_BOARD = "Reroll Board"
}

export interface MessageData {
    [key: string]: any
}

export interface AppMessage<T extends MessageData = {}> {
    op: Op
    data: T
}

export interface GameMessage<T extends MessageData = {}> {
    userId: string
    op: Op
    data?: T
}

export interface GameMessageEvent<
    M extends AppMessage<MessageData> | GameMessage<MessageData>
> extends MessageEvent {
    data: M
}
