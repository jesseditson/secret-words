export enum Op {
    UNKNOWN = "Unknown",
    CREATE_USER = "Create User",
    INITIALIZE = "Initialize",
    UPDATE_STATE = "Update State",
    CREATE_GAME = "Create Game",
    GAME_CHANGED = "Game Change",
    USER_CHANGED = "User Change",
    JOIN_GAME = "Join Game",
    SHOW_GAME = "Show Game",
    HIDE_GAME = "Hide Game",
    CHANGE_TEAM = "Change Team",
    START_GAME = "Start Game"
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
