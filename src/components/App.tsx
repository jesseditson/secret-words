import React, { FunctionComponent, useState, useEffect } from "react"
import { AppState, GameState } from "../lib/types"
import { GameMessageEvent, Op, AppMessage } from "../lib/messages"
import { Games } from "./Games"
import { Login } from "./Login"
import { Link } from "./Link"
import { GameBoard } from "./GameBoard"
import { ChooseTeams } from "./ChooseTeams"
import { ChevronLeft } from "react-feather"
import { Tiles } from "./Tiles"
import "./tiles.scss"

interface AppProps {
    worker: Worker
    sendMessage: (op: Op, data?: object) => void
    userId?: string
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
            if (msg.data.op === Op.UPDATE_STATE) {
                setAppState(cs => ({ ...cs, ...msg.data.data }))
            }
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
            <nav className="header">
                {appState.currentGame ? (
                    <Link href="/" onClick={() => sendMessage(Op.HIDE_GAME)}>
                        <ChevronLeft /> Games
                    </Link>
                ) : (
                    <div className="spacer" />
                )}
                <h1>Secret Words</h1>
                {appState.currentUser && (
                    <span>{appState.currentUser.name}</span>
                )}
            </nav>
            <section className="content">
                {!appState.currentUser && (
                    <Login
                        onCreateUser={name =>
                            sendMessage(Op.CREATE_USER, { name })
                        }
                    />
                )}
                {appState.currentUser && !appState.currentGame && (
                    <Games
                        games={appState.games}
                        userId={appState.currentUser._id}
                        onCreateGame={name =>
                            sendMessage(Op.CREATE_GAME, { name })
                        }
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
                        onSetHinter={(playerId, team) =>
                            sendMessage(Op.MAKE_HINTER, {
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
                {appState.currentGame &&
                    appState.currentGame.state === GameState.NEW && (
                        <div className="board">
                            <nav>
                                <h4>Game Board</h4>
                                <button
                                    onClick={() =>
                                        sendMessage(Op.REROLL_BOARD, {
                                            gameId: appState.currentGame!._id
                                        })
                                    }
                                >
                                    Reroll Board
                                </button>
                            </nav>
                            <Tiles
                                tiles={appState.currentGameTiles!}
                                isGuessing={false}
                                showTeams={false}
                            />
                        </div>
                    )}
                {appState.currentGame &&
                    appState.currentGame.state !== GameState.NEW && (
                        <GameBoard
                            game={appState.currentGame!}
                            user={appState.currentUser!}
                            tiles={appState.currentGameTiles!}
                            userTeam={appState.currentTeam!}
                            onGuess={tile =>
                                sendMessage(Op.GUESS_TILE, {
                                    tileId: tile._id,
                                    gameId: appState.currentGame!._id
                                })
                            }
                            onSetGuessCount={count =>
                                sendMessage(Op.SET_GUESS_COUNT, {
                                    count,
                                    gameId: appState.currentGame!._id
                                })
                            }
                            onFinishGuessing={() =>
                                sendMessage(Op.FINISH_GUESSING, {
                                    gameId: appState.currentGame!._id
                                })
                            }
                        />
                    )}
            </section>
        </div>
    )
}
