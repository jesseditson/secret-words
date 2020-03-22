import React, { FunctionComponent, useState } from "react"
import { Game, User, Tile } from "../lib/types"

interface GameBoardProps {
    game: Game
    tiles: Tile[]
    user: User
}

export const GameBoard: FunctionComponent<GameBoardProps> = ({
    game,
    tiles,
    user
}) => {
    console.log(game, tiles)
    return (
        <div id="game">
            <h2>{game.name}</h2>
        </div>
    )
}
