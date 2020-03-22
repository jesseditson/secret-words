import React, { FunctionComponent, useState } from "react"
import { Link } from "./Link"
import { Game } from "../lib/types"

interface GamesProps {
    games: Game[]
    userId: string
    onCreateGame: (name: string) => void
    onJoinGame: (game: Game) => void
    onViewGame: (game: Game) => void
}

export const Games: FunctionComponent<GamesProps> = ({
    games,
    userId,
    onCreateGame,
    onJoinGame,
    onViewGame
}) => {
    const [showingNewDialog, setShowingNewDialog] = useState(false)
    const [newGameName, setNewGameName] = useState<string>("")
    return (
        <div id="games">
            <h2>Active Games</h2>
            <ul>
                {games.map(game => {
                    const inGame = game.playerIds.find(id => id === userId)
                    return (
                        <li className="game" key={game._id}>
                            <div className="info">
                                <h3>{game.name}</h3>
                                <span>
                                    {game.playerIds.length} player
                                    {game.playerIds.length > 1 ? "s" : ""}
                                </span>
                            </div>
                            <Link
                                href={`/game/${game._id}`}
                                onClick={() =>
                                    inGame ? onViewGame(game) : onJoinGame(game)
                                }
                            >
                                {inGame ? "Show" : "Join"}
                            </Link>
                        </li>
                    )
                })}
            </ul>
            <button onClick={() => setShowingNewDialog(true)}>New Game</button>
            {showingNewDialog ? (
                <div className="dialog">
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            onCreateGame(newGameName!)
                            setShowingNewDialog(false)
                        }}
                    >
                        <fieldset>
                            <label htmlFor="game-name">Name</label>
                            <input
                                id="game-name"
                                placeholder="Good Vibes"
                                value={newGameName}
                                onChange={e => setNewGameName(e.target.value)}
                            />
                        </fieldset>
                        <button disabled={!newGameName}>Create</button>
                    </form>
                </div>
            ) : null}
        </div>
    )
}
