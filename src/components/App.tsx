import React, { FunctionComponent, useState, useEffect } from "react"
import { Game, User } from "../lib/types"
import { GameMessageEvent, Op, AppMessage } from "../lib/messages"
import { Games } from "./Games"
import { Login } from "./Login"

interface AppState {
    games: Game[]
    currentUser?: User
    initialized: boolean
}

interface AppProps {
    worker: Worker
    sendMessage: (op: Op, data?: object) => void
}

const stateFromMessage = (
    msg: GameMessageEvent<any>,
    currentState: AppState
): Partial<AppState> | void => {
    const { op, data } = msg.data
    switch (op) {
        case Op.INITIALIZE:
            return data
        case Op.GAME_CHANGED:
            const newState = { games: [...currentState.games] }
            let found = false
            for (const [idx, game] of currentState.games.entries()) {
                if (game._id === data._id) {
                    newState.games[idx] = data
                    found = true
                    break
                }
            }
            if (!found) {
                newState.games.push(data)
            }
            return newState
        case Op.USER_CHANGED:
            if (data._id === currentState.currentUser?._id) {
                return { currentUser: data }
            }
            break
    }
}

export const App: FunctionComponent<AppProps> = ({ worker, sendMessage }) => {
    const [appState, setAppState] = useState<AppState>({
        games: [],
        initialized: false
    })
    useEffect(() => {
        worker.onmessage = async (msg: GameMessageEvent<AppMessage>) => {
            setAppState(cs => {
                const newState = stateFromMessage(msg, cs)
                if (newState) {
                    console.log(msg.data.op, newState)
                    return { ...cs, ...newState }
                }
                return cs
            })
        }
    }, [worker])
    if (!appState.initialized) {
        return <div id="app">Loading...</div>
    }
    return (
        <div id="app">
            <h1>Secret Words</h1>
            {!appState.currentUser && (
                <Login
                    onCreateUser={name => sendMessage(Op.CREATE_USER, { name })}
                />
            )}
            {appState.currentUser && (
                <Games
                    games={appState.games}
                    onCreateGame={name => sendMessage(Op.CREATE_GAME, { name })}
                    onSelectGame={game => {}}
                />
            )}
        </div>
    )
}
