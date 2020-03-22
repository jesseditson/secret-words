import { Tile, Team } from "./types"

export const countTilesLeft = (tiles: Tile[], team: Team): number =>
    tiles.reduce(
        (n, tile) =>
            tile.team === team && tile.guessedBy === undefined ? n + 1 : n,
        0
    )

export const getWinner = (
    tiles: Tile[],
    redTilesRemaining?: number,
    blueTilesRemaining?: number
): Team => {
    const guessedDeath = tiles.find(
        tile => tile.team === Team.DEATH && tile.guessedBy !== undefined
    )
    redTilesRemaining =
        redTilesRemaining === undefined
            ? countTilesLeft(tiles, Team.RED)
            : redTilesRemaining
    blueTilesRemaining =
        blueTilesRemaining === undefined
            ? countTilesLeft(tiles, Team.RED)
            : blueTilesRemaining
    return guessedDeath
        ? guessedDeath.guessedBy! === Team.RED
            ? Team.BLUE
            : Team.RED
        : redTilesRemaining === 0
        ? Team.RED
        : blueTilesRemaining === 0
        ? Team.BLUE
        : Team.NONE
}
