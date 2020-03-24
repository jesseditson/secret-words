import React, { FunctionComponent } from "react"
import classNames from "classnames"
import { Tile, Team } from "../lib/types"
import "./tiles.scss"

interface TilesProps {
    tiles: Tile[]
    showTeams: boolean
    isGuessing: boolean
    onClickTile?: (tile: Tile) => void
}

export const Tiles: FunctionComponent<TilesProps> = ({
    tiles,
    showTeams,
    isGuessing,
    onClickTile
}) => {
    return (
        <div className="tiles">
            {tiles.map(tile => {
                const isGuessed = tile.guessedBy !== undefined
                const showColor = showTeams || isGuessed
                return (
                    <div
                        key={tile._id}
                        onClick={() =>
                            isGuessing && onClickTile ? onClickTile(tile) : null
                        }
                        className={classNames("tile", {
                            clickable: isGuessing,
                            guessed: isGuessed,
                            showing: showTeams,
                            red: showColor && tile.team === Team.RED,
                            neutral: showColor && tile.team === Team.NONE,
                            blue: showColor && tile.team === Team.BLUE,
                            death: showColor && tile.team === Team.DEATH
                        })}
                    >
                        {tile.word}
                    </div>
                )
            })}
        </div>
    )
}
