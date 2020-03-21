import React, { FunctionComponent, useState } from "react"
import { Game } from "../lib/types"

interface GamesProps {
    games: Game[]
    onCreateGame: (name: string) => void
    onSelectGame: (game: Game) => void
}

export const Games: FunctionComponent<GamesProps> = ({
    games,
    onCreateGame,
    onSelectGame
}) => {
    const [showingNewDialog, setShowingNewDialog] = useState(false)
    const [newGameName, setNewGameName] = useState<string>("")
    return (
        <div id="games">
            <h2>Active Games</h2>
            <ul>
                {games.map(game => (
                    <li
                        className="game"
                        key={game._id}
                        onClick={() => onSelectGame(game)}
                    >
                        <h3>{game.name}</h3>
                        {/* <span>{game.}</span> */}
                    </li>
                ))}
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
