import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { BoardNumber, Colors, Figures } from "../config";

export function buildCellsMap(figures) {
  const map = {};
  for (let x = 1; x <= 8; x++) {
    for (let y = 1; y <= 8; y++) {
      map[`${x}-${y}`] = null;
    }
  }
  for (const id in figures) {
    const f = figures[id];
    if (f && f.x && f.y) {
      map[`${f.x}-${f.y}`] = f;
    }
  }
  return map;
}

export function formatSquare(x, y) {
  return `${BoardNumber[x]}${y}`;
}

export function getOtherColor(color) {
  return color === Colors.BLACK ? Colors.WHITE : Colors.BLACK;
}

export function getAvailableCells(figure, figures, isForDangerousCells = false) {
  const cellsFigure = buildCellsMap(figures);
  let way = [];

  const toStopWay = (x, y) => {
    if (cellsFigure[`${x}-${y}`] === undefined) return true;
    if (cellsFigure[`${x}-${y}`]) return true;
    return false;
  };

  const checkCellForMove = (x, y) => {
    if (toStopWay(x, y)) return false;
    way.push({ x, y });
    return true;
  };

  const verticalTop = (toY, fromY = figure.y) => {
    for (let i = fromY + 1; i <= toY; i++) {
      if (toStopWay(figure.x, i)) return;
      way.push({ y: i, x: figure.x });
    }
  };

  const verticalBottom = (toY, fromY = figure.y) => {
    for (let i = fromY - 1; i >= toY; i--) {
      if (toStopWay(figure.x, i)) return;
      way.push({ y: i, x: figure.x });
    }
  };

  const horizontalLeft = (toX, fromX = figure.x) => {
    for (let i = fromX - 1; i >= toX; i--) {
      if (toStopWay(i, figure.y)) return;
      way.push({ x: i, y: figure.y });
    }
  };

  const horizontalRight = (toX, fromX = figure.x) => {
    for (let i = fromX + 1; i <= toX; i++) {
      if (toStopWay(i, figure.y)) return;
      way.push({ x: i, y: figure.y });
    }
  };

  const checkDiagonal = () => {
    for (let i = 1; i <= 8; i++) {
      if (!checkCellForMove(figure.x + i, figure.y + i)) break;
    }
    for (let i = 1; i <= 8; i++) {
      if (!checkCellForMove(figure.x + i, figure.y - i)) break;
    }
    for (let i = 1; i <= 8; i++) {
      if (!checkCellForMove(figure.x - i, figure.y - i)) break;
    }
    for (let i = 1; i <= 8; i++) {
      if (!checkCellForMove(figure.x - i, figure.y + i)) break;
    }
  };

  const isEatableCell = (x, y) => {
    const target = cellsFigure[`${x}-${y}`];
    return target && target.color !== figure.color;
  };

  const checkEatableCell = (x, y) => {
    if (isEatableCell(x, y)) {
      way.push({ x, y });
      return true;
    }
    return false;
  };

  const checkEatableOrAlliesCell = (x, y) => {
    const target = cellsFigure[`${x}-${y}`];
    if (target && target.color === figure.color) return true;
    if (isEatableCell(x, y)) {
      way.push({ x, y });
      return true;
    }
    return false;
  };

  const checkEatableFiguresByDiagonal = () => {
    for (let i = 1; i <= 8; i++) {
      if (checkEatableOrAlliesCell(figure.x + i, figure.y + i)) break;
    }
    for (let i = 1; i <= 8; i++) {
      if (checkEatableOrAlliesCell(figure.x + i, figure.y - i)) break;
    }
    for (let i = 1; i <= 8; i++) {
      if (checkEatableOrAlliesCell(figure.x - i, figure.y - i)) break;
    }
    for (let i = 1; i <= 8; i++) {
      if (checkEatableOrAlliesCell(figure.x - i, figure.y + i)) break;
    }
  };

  const checkEatableFiguresByRook = () => {
    for (let i = figure.y + 1; i <= 8; i++) {
      if (checkEatableOrAlliesCell(figure.x, i)) break;
    }
    for (let i = figure.y - 1; i >= 1; i--) {
      if (checkEatableOrAlliesCell(figure.x, i)) break;
    }
    for (let i = figure.x - 1; i >= 1; i--) {
      if (checkEatableOrAlliesCell(i, figure.y)) break;
    }
    for (let i = figure.x + 1; i <= 8; i++) {
      if (checkEatableOrAlliesCell(i, figure.y)) break;
    }
  };

  // PAWN
  if (figure.name === Figures.PAWN) {
    if (figure.color === Colors.BLACK) {
      if (!isForDangerousCells) {
        // Can move 2 squares only from starting rank 7
        const limitY = figure.y === 7 ? figure.y - 2 : figure.y - 1;
        verticalBottom(limitY);
      } else {
        way.push({ y: figure.y - 1, x: figure.x - 1 });
        way.push({ y: figure.y - 1, x: figure.x + 1 });
      }
      checkEatableCell(figure.x - 1, figure.y - 1);
      checkEatableCell(figure.x + 1, figure.y - 1);
    } else {
      if (!isForDangerousCells) {
        // Can move 2 squares only from starting rank 2
        const limitY = figure.y === 2 ? figure.y + 2 : figure.y + 1;
        verticalTop(limitY);
      } else {
        way.push({ y: figure.y + 1, x: figure.x - 1 });
        way.push({ y: figure.y + 1, x: figure.x + 1 });
      }
      checkEatableCell(figure.x - 1, figure.y + 1);
      checkEatableCell(figure.x + 1, figure.y + 1);
    }
  }

  // ROOK
  if (figure.name === Figures.ROOK) {
    verticalBottom(1);
    verticalTop(8);
    horizontalLeft(1);
    horizontalRight(8);
    checkEatableFiguresByRook();
  }

  // KNIGHT
  if (figure.name === Figures.KNIGHT) {
    const knightOffsets = [
      [1, 2], [-1, 2], [2, 1], [2, -1],
      [1, -2], [-1, -2], [-2, -1], [-2, 1]
    ];
    for (const [dx, dy] of knightOffsets) {
      const nx = figure.x + dx;
      const ny = figure.y + dy;
      if (nx >= 1 && nx <= 8 && ny >= 1 && ny <= 8) {
        checkCellForMove(nx, ny);
        checkEatableOrAlliesCell(nx, ny);
      }
    }
  }

  // BISHOP
  if (figure.name === Figures.BISHOP) {
    checkDiagonal();
    checkEatableFiguresByDiagonal();
  }

  // QUEEN
  if (figure.name === Figures.QUEEN) {
    checkDiagonal();
    checkEatableFiguresByDiagonal();
    verticalBottom(1);
    verticalTop(8);
    horizontalLeft(1);
    horizontalRight(8);
    checkEatableFiguresByRook();
  }

  // KING
  if (figure.name === Figures.KING) {
    verticalBottom(figure.y - 1);
    verticalTop(figure.y + 1);
    horizontalLeft(figure.x - 1);
    horizontalRight(figure.x + 1);
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
      checkCellForMove(figure.x + dx, figure.y + dy);
      checkEatableOrAlliesCell(figure.x + dx, figure.y + dy);
    }
  }

  const obj = {};
  way.forEach((el) => {
    if (el.x >= 1 && el.x <= 8 && el.y >= 1 && el.y <= 8) {
      obj[`${el.x}-${el.y}`] = true;
    }
  });
  return obj;
}

export function getBoardAscii(figures) {
  const cells = buildCellsMap(figures);
  const rows = [];

  const pieceChar = (name) => {
    switch (name) {
      case Figures.PAWN: return "p";
      case Figures.KNIGHT: return "n";
      case Figures.BISHOP: return "b";
      case Figures.ROOK: return "r";
      case Figures.QUEEN: return "q";
      case Figures.KING: return "k";
      default: return ".";
    }
  };

  for (let y = 8; y >= 1; y--) {
    const rowChars = [];
    for (let x = 1; x <= 8; x++) {
      const fig = cells[`${x}-${y}`];
      if (!fig) {
        rowChars.push(".");
      } else {
        const ch = pieceChar(fig.name);
        rowChars.push(fig.color === Colors.WHITE ? ch.toUpperCase() : ch.toLowerCase());
      }
    }
    rows.push(`${y}  ${rowChars.join(" ")}`);
  }
  rows.push("   A B C D E F G H");
  return rows.join("\n");
}

export function getMaterialSummary(figures) {
  const counts = {
    white: { pawns: 0, knights: 0, bishops: 0, rooks: 0, queens: 0, score: 0 },
    black: { pawns: 0, knights: 0, bishops: 0, rooks: 0, queens: 0, score: 0 },
  };

  const values = {
    [Figures.PAWN]: 1,
    [Figures.KNIGHT]: 3,
    [Figures.BISHOP]: 3,
    [Figures.ROOK]: 5,
    [Figures.QUEEN]: 9,
    [Figures.KING]: 0,
  };

  for (const id in figures) {
    const f = figures[id];
    if (!f || !f.color) continue;
    const target = f.color === Colors.WHITE ? counts.white : counts.black;
    const val = values[f.name] || 0;
    target.score += val;
    if (f.name === Figures.PAWN) target.pawns++;
    else if (f.name === Figures.KNIGHT) target.knights++;
    else if (f.name === Figures.BISHOP) target.bishops++;
    else if (f.name === Figures.ROOK) target.rooks++;
    else if (f.name === Figures.QUEEN) target.queens++;
  }
  return counts;
}

export function getAllLegalMoves(figures, color) {
  const cellsFigure = buildCellsMap(figures);
  const colorFigures = Object.values(figures).filter((f) => f && f.color === color);
  const enemyFigures = Object.values(figures).filter((f) => f && f.color !== color);

  // Identify squares attacked by opponent
  const attackedSquares = new Set();
  for (const enemy of enemyFigures) {
    const moves = getAvailableCells(enemy, figures, true);
    for (const pos in moves) {
      attackedSquares.add(pos);
    }
  }

  const pieceValues = {
    [Figures.PAWN]: 1,
    [Figures.KNIGHT]: 3,
    [Figures.BISHOP]: 3,
    [Figures.ROOK]: 5,
    [Figures.QUEEN]: 9,
    [Figures.KING]: 100,
  };

  const candidates = [];

  for (const figure of colorFigures) {
    const available = getAvailableCells(figure, figures);
    for (const key in available) {
      const [destXStr, destYStr] = key.split("-");
      const destX = Number(destXStr);
      const destY = Number(destYStr);
      const fromSq = formatSquare(figure.x, figure.y);
      const toSq = formatSquare(destX, destY);
      const moveKey = `${fromSq}-${toSq}`;

      const targetPiece = cellsFigure[`${destX}-${destY}`];
      const isCapture = targetPiece && targetPiece.color !== figure.color;
      const capturedType = isCapture ? targetPiece.name : null;

      let tacticalScore = 0;
      if (isCapture && capturedType) {
        tacticalScore += (pieceValues[capturedType] || 1) * 10 - (pieceValues[figure.name] || 1);
      }

      const isCenter = ["D4", "D5", "E4", "E5"].includes(toSq);
      const isNearCenter = ["C3", "C4", "C5", "C6", "F3", "F4", "F5", "F6"].includes(toSq);
      if (isCenter) tacticalScore += 3;
      else if (isNearCenter) tacticalScore += 1;

      // Minor piece development
      const isMinorPiece = figure.name === Figures.KNIGHT || figure.name === Figures.BISHOP;
      const isStartingRank = (figure.color === Colors.BLACK && figure.y === 8) || (figure.color === Colors.WHITE && figure.y === 1);
      if (isMinorPiece && isStartingRank) {
        tacticalScore += 4;
      }

      // Promotion
      const isPromotion = figure.name === Figures.PAWN && ((figure.color === Colors.BLACK && destY === 1) || (figure.color === Colors.WHITE && destY === 8));
      if (isPromotion) tacticalScore += 25;

      // Penalty if stepping into attacked cell without capturing equal/better
      if (attackedSquares.has(key) && !isCapture) {
        tacticalScore -= (pieceValues[figure.name] || 1) * 2;
      }

      const oppColorName = figure.color === Colors.WHITE ? "Black" : "White";
      const descParts = [];
      const pieceName = figure.name.charAt(0).toUpperCase() + figure.name.slice(1);
      if (isCapture && capturedType) {
        descParts.push(`Captures ${oppColorName} ${capturedType} at ${toSq}`);
      } else if (isPromotion) {
        descParts.push(`Promotes pawn to Queen at ${toSq}`);
      } else {
        descParts.push(`Moves ${pieceName} from ${fromSq} to ${toSq}`);
      }

      if (isCenter) descParts.push("fights for center control");
      if (isMinorPiece && isStartingRank) descParts.push("develops minor piece");
      if (attackedSquares.has(key)) descParts.push(`caution: square defended by ${oppColorName}`);

      candidates.push({
        moveKey,
        figure,
        x: destX,
        y: destY,
        fromSquare: fromSq,
        toSquare: toSq,
        description: descParts.join(", "),
        isCapture,
        capturedType,
        tacticalScore,
      });
    }
  }

  candidates.sort((a, b) => b.tacticalScore - a.tacticalScore);
  return candidates;
}

export async function decideJevMove(figures, color = Colors.BLACK) {
  const candidates = getAllLegalMoves(figures, color);

  if (candidates.length === 0) {
    throw new Error("No legal moves available for " + color);
  }

  const isWhite = color === Colors.WHITE;
  const activePlayer = isWhite ? "White (Player 1 / Human)" : "Black (Player 2 / Computer)";
  const opponentPlayer = isWhite ? "Black (Player 2 / Computer)" : "White (Player 1 / Human)";

  if (candidates.length === 1) {
    return {
      candidate: candidates[0],
      choiceKey: candidates[0].moveKey,
      confidence: 1.0,
      source: "forced",
      reasoning: "Only one legal move available: " + candidates[0].description,
      topCandidates: candidates.slice(0, 5),
      probabilities: { [candidates[0].moveKey]: 1.0 },
      usage: null,
      candidatesCount: 1,
    };
  }

  const apiKey =
    process.env.REACT_APP_TYPESAFE_API_KEY ||
    process.env.TYPESAFE_API_KEY;

  if (!apiKey) {
    console.warn("TYPESAFE_API_KEY is not set. Using tactical fallback.");
    return {
      candidate: candidates[0],
      choiceKey: candidates[0].moveKey,
      confidence: 0.5,
      source: "fallback",
      reasoning: "API key not found; playing top tactical move: " + candidates[0].description,
      topCandidates: candidates.slice(0, 5),
      probabilities: { [candidates[0].moveKey]: 0.5 },
      usage: null,
      candidatesCount: candidates.length,
    };
  }

  const criteria = {};
  for (const c of candidates) {
    criteria[c.moveKey] = c.description;
  }

  const boardAscii = getBoardAscii(figures);
  const material = getMaterialSummary(figures);

  try {
    const client = new TypeSafeClient({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    const instruction = isWhite
      ? "You are a master chess coach advising White. Select the single best, most principled chess move for White from the legal candidate moves. Prioritize king safety, exploiting undefended enemy pieces, center control, piece coordination, and solid tactical soundness."
      : "Select the best and most principled chess move for Black (Player 2) from the legal candidate moves. Prioritize king safety, taking undefended pieces, fighting for the center, developing pieces, and avoiding blunders.";

    const response = await client.systemOne({
      state: {
        game: "Chess",
        active_player: activePlayer,
        opponent: opponentPlayer,
        board_ascii: boardAscii,
        material_summary: {
          white: `Pawns: ${material.white.pawns}, Knights: ${material.white.knights}, Bishops: ${material.white.bishops}, Rooks: ${material.white.rooks}, Queens: ${material.white.queens}`,
          black: `Pawns: ${material.black.pawns}, Knights: ${material.black.knights}, Bishops: ${material.black.bishops}, Rooks: ${material.black.rooks}, Queens: ${material.black.queens}`,
        },
        legal_moves_count: candidates.length,
      },
      model: "jev-latest",
      questions: {
        selected_move: choice(instruction, criteria),
      },
    });

    const chosenKey = response.answers.selected_move.choice;
    const confidence = response.answers.selected_move.confidence;
    const probabilities = response.answers.selected_move.probabilities;

    const matched = candidates.find((c) => c.moveKey === chosenKey);
    if (matched) {
      return {
        candidate: matched,
        choiceKey: chosenKey,
        confidence,
        probabilities,
        source: "jev",
        reasoning: matched.description,
        topCandidates: candidates.slice(0, 5),
        usage: response.usage,
        candidatesCount: candidates.length,
      };
    }

    console.warn(`Jev selected unknown move ${chosenKey}, falling back to top tactical candidate`);
  } catch (error) {
    console.error("Error evaluating move with Jev:", error);
  }

  const fallback = candidates[0];
  return {
    candidate: fallback,
    choiceKey: fallback.moveKey,
    confidence: 0.5,
    source: "fallback",
    reasoning: "Fallback selected top tactical move: " + fallback.description,
    topCandidates: candidates.slice(0, 5),
    probabilities: { [fallback.moveKey]: 0.5 },
    usage: null,
    candidatesCount: candidates.length,
  };
}
