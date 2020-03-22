import React, { FunctionComponent, useState } from "react"
import { Game, User } from "../lib/types"

interface GameBoardProps {
    game: Game
    user: User
}

export const GameBoard: FunctionComponent<GameBoardProps> = ({
    game,
    user
}) => {
    console.log(game)
    return (
        <div id="game">
            <h2>{game.name}</h2>
        </div>
    )
}
