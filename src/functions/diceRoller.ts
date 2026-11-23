/**
 * Rola um dado e retorna o resultado formatado.
 * @param sides - O número de lados do dado (4, 6, 8, 20, etc.).
 * @returns O resultado da rolagem entre 1 e sides.
 */
export function rollDice(sides: number): number {
  const cleanSides = Math.floor(sides);
  if (!Number.isFinite(cleanSides) || cleanSides < 1) {
    return 1;
  }
  return Math.floor(Math.random() * cleanSides) + 1;
}
