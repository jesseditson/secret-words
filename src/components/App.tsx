import React, { FunctionComponent, useState, useEffect } from "react"
import { AppState, GameState } from "../lib/types"
import { GameMessageEvent, Op, AppMessage } from "../lib/messages"
import { Games } from "./Games"
import { Login } from "./Login"
import { Link } from "./Link"
import { GameBoard } from "./GameBoard"
import { ChooseTeams } from "./ChooseTeams"

interface AppProps {
    worker: Worker
    sendMessage: (op: Op, data?: object) => void
    userId?: string
}

const stateFromMessage = (
    msg: GameMessageEvent<any>,
    currentState: AppState
): Partial<AppState> | void => {
    const { op, data } = msg.data
    switch (op) {
        case Op.UPDATE_STATE:
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

const GAME_MATCH = /\/game\/([\w-]+)/i

export const App: FunctionComponent<AppProps> = ({
    worker,
    sendMessage,
    userId
}) => {
    const [appState, setAppState] = useState<AppState>({
        games: [],
        initialized: false
    })
    useEffect(() => {
        worker.onmessage = async (msg: GameMessageEvent<AppMessage>) => {
            setAppState(cs => {
                const newState = stateFromMessage(msg, cs)
                if (newState) {
                    return { ...cs, ...newState }
                }
                return cs
            })
        }
        sendMessage(Op.INITIALIZE, { userId })
    }, [worker, userId])
    useEffect(() => {
        const gameMatch = window.location.pathname.match(GAME_MATCH)
        if (gameMatch) {
            const gameId = gameMatch[1]
            if (appState.currentGame?._id !== gameId) {
                sendMessage(Op.JOIN_GAME, { gameId })
            }
        } else if (window.location.pathname === "/" && appState.currentGame) {
            sendMessage(Op.HIDE_GAME)
        }
    }, [window.location.href, appState.games.length])
    if (!appState.initialized) {
        return <div id="app">Loading...</div>
    }
    return (
        <div id="app">
            <h1>Secret Words</h1>
            {appState.currentGame && (
                <Link href="/" onClick={() => sendMessage(Op.HIDE_GAME)}>
                    Back to Games
                </Link>
            )}
            {!appState.currentUser && (
                <Login
                    onCreateUser={name => sendMessage(Op.CREATE_USER, { name })}
                />
            )}
            {appState.currentUser && !appState.currentGame && (
                <Games
                    games={appState.games}
                    userId={appState.currentUser._id}
                    onCreateGame={name => sendMessage(Op.CREATE_GAME, { name })}
                    onDeleteGame={game =>
                        sendMessage(Op.DELETE_GAME, { gameId: game._id })
                    }
                    onJoinGame={game => {
                        sendMessage(Op.JOIN_GAME, { gameId: game._id })
                    }}
                    onViewGame={game => {
                        sendMessage(Op.SHOW_GAME, { gameId: game._id })
                    }}
                />
            )}
            {appState.currentGame?.state === GameState.NEW && (
                <ChooseTeams
                    players={appState.currentPlayers!}
                    game={appState.currentGame}
                    onChooseTeam={(playerId, team) =>
                        sendMessage(Op.CHANGE_TEAM, {
                            gameId: appState.currentGame?._id,
                            playerId,
                            team
                        })
                    }
                    onComplete={() =>
                        sendMessage(Op.START_GAME, {
                            gameId: appState.currentGame?._id
                        })
                    }
                />
            )}
            {appState.currentGame?.state === GameState.STARTED && (
                <GameBoard
                    game={appState.currentGame!}
                    user={appState.currentUser!}
                    tiles={appState.currentGameTiles!}
                />
            )}
        </div>
    )
}