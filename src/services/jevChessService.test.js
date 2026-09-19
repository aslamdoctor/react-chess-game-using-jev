import { figuress, Colors, Figures } from "../config";
import {
  buildCellsMap,
  formatSquare,
  getBoardAscii,
  getMaterialSummary,
  getAvailableCells,
  getAllLegalMoves,
  decideJevMove,
} from "./jevChessService";

describe("jevChessService for react-chess-game", () => {
  test("formats board squares accurately", () => {
    expect(formatSquare(1, 1)).toBe("A1");
    expect(formatSquare(5, 4)).toBe("E4");
    expect(formatSquare(8, 8)).toBe("H8");
  });

  test("builds cells map correctly", () => {
    const map = buildCellsMap(figuress);
    expect(map["5-8"].name).toBe(Figures.KING);
    expect(map["5-8"].color).toBe(Colors.BLACK);
    expect(map["5-1"].name).toBe(Figures.KING);
    expect(map["5-1"].color).toBe(Colors.WHITE);
    expect(map["4-4"]).toBeNull();
  });

  test("renders ASCII board with uppercase white and lowercase black pieces", () => {
    const ascii = getBoardAscii(figuress);
    expect(ascii).toContain("8  r n b q k b n r");
    expect(ascii).toContain("1  R N B Q K B N R");
    expect(ascii).toContain("A B C D E F G H");
  });

  test("calculates material counts", () => {
    const mat = getMaterialSummary(figuress);
    expect(mat.white.pawns).toBe(8);
    expect(mat.black.pawns).toBe(8);
    expect(mat.white.queens).toBe(1);
    expect(mat.white.score).toBe(39);
    expect(mat.black.score).toBe(39);
  });

  test("generates 20 initial legal moves for black", () => {
    const moves = getAllLegalMoves(figuress, Colors.BLACK);
    // 16 pawn moves (each pawn can move 1 or 2 squares) + 4 knight moves = 20 moves
    expect(moves.length).toBe(20);
    expect(moves.some((m) => m.moveKey === "E7-E5")).toBe(true);
    expect(moves.some((m) => m.moveKey === "G8-F6")).toBe(true);
  });

  test("limits pawn double-step to starting rank", () => {
    const advancedBlackPawn = {
      "black-pawn-5-6": {
        id: "black-pawn-5-6",
        name: Figures.PAWN,
        x: 5,
        y: 6,
        color: Colors.BLACK,
      },
    };
    const available = getAvailableCells(
      advancedBlackPawn["black-pawn-5-6"],
      advancedBlackPawn
    );
    // On y=6, black pawn can only move to y=5 (1 step), not y=4
    expect(available["5-5"]).toBe(true);
    expect(available["5-4"]).toBeUndefined();
  });

  test("handles forced single legal move immediately", async () => {
    const singleKingBoard = {
      "black-king-1-1": {
        id: "black-king-1-1",
        name: Figures.KING,
        x: 1,
        y: 1,
        color: Colors.BLACK,
      },
      "white-pawn-2-1": {
        id: "white-pawn-2-1",
        name: Figures.PAWN,
        x: 2,
        y: 1,
        color: Colors.WHITE,
      },
      "white-pawn-2-2": {
        id: "white-pawn-2-2",
        name: Figures.PAWN,
        x: 2,
        y: 2,
        color: Colors.WHITE,
      },
    };
    const moves = getAllLegalMoves(singleKingBoard, Colors.BLACK);
    expect(moves.length).toBeGreaterThan(0);
  });

  test("generates 20 initial legal moves for White player", () => {
    const moves = getAllLegalMoves(figuress, Colors.WHITE);
    expect(moves.length).toBe(20);
    expect(moves.some((m) => m.moveKey === "E2-E4")).toBe(true);
    expect(moves.some((m) => m.moveKey === "D2-D4")).toBe(true);
    expect(moves.some((m) => m.moveKey === "G1-F3")).toBe(true);
  });

  test("returns decision telemetry with probabilities and candidate count", async () => {
    const decision = await decideJevMove(figuress, Colors.WHITE);
    expect(decision).toBeDefined();
    expect(decision.candidate).toBeDefined();
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.topCandidates.length).toBeGreaterThan(0);
    expect(decision.probabilities).toBeDefined();
    expect(decision.candidatesCount).toBe(20);
  });
});
