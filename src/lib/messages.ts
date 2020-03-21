export enum Op {
    UNKNOWN,
    CREATE_USER,
    INITIALIZE,
    CREATE_GAME,
    GAME_CHANGED,
    USER_CHANGED
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
