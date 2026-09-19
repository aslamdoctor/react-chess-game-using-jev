import React, { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import styles from "./Board.module.css";
import { BoardNumber, Colors, Figures } from "../../config";
import Boxes from "../Boxes/Boxes";
import Figure from "../Figure/Figure";
import JevAdvisor from "../JevAdvisor/JevAdvisor";
import ConfettiExplosion from "react-confetti-explosion";
import {
  changeFigurePosition,
  removeFigure,
  selectColor,
  selectFigures,
  setGameStarted,
  selectGameWon,
  setGameWon,
  resetGame,
  promoteFigure,
} from "../../store/game/game";
import chessLogo from "../../assets/chesslogo.png";
import { useAppDispatch, useAppSelector } from "../../store/hooks/hooks";
import store from "../../store/store";
import {
  decideJevMove,
  getAvailableCells,
  getAllLegalMoves,
} from "../../services/jevChessService";

function Board() {
  const dispatch = useAppDispatch();
  const gameColor = useAppSelector(selectColor);
  const figures = useAppSelector(selectFigures);
  const gameWon = useAppSelector(selectGameWon);

  const [isKingInCheck, setIsKingInCheck] = useState(false);
  const dangerousCells = useRef({ white: {}, black: {} });
  const boardRef = useRef(null);
  const [choseFigurePos, setChoseFigurePos] = useState(null);

  const [currentTurn, setCurrentTurn] = useState(Colors.WHITE);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [jevDecision, setJevDecision] = useState(null);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState(null);

  const sides = {
    ally: gameColor,
    enemy: gameColor === Colors.WHITE ? Colors.BLACK : Colors.WHITE,
  };

  const isAvailableCellForMove = (x, y) => {
    if (choseFigurePos && choseFigurePos.availableCells[`${x}-${y}`]) {
      return true;
    }
    return false;
  };

  const isCellHavingFigure = (x, y) => {
    for (const id in figures) {
      if (figures[id].x === x && figures[id].y === y) return true;
    }
    return false;
  };

  const endGame = useCallback(
    (winner) => {
      dispatch(setGameWon(winner));
      dispatch(setGameStarted(false));
    },
    [dispatch]
  );

  const getOtherColor = (color) => {
    return color === Colors.BLACK ? Colors.WHITE : Colors.BLACK;
  };

  const eatFigure = useCallback(
    (figure) => {
      if (figure.name === Figures.KING) {
        endGame(getOtherColor(figure.color));
      }
      dispatch(removeFigure(figure));
    },
    [dispatch, endGame]
  );

  const moveOn = useCallback(
    (figure, x, y) => {
      dispatch(changeFigurePosition({ figure, x, y }));
      setChoseFigurePos(null);

      // Auto-promote pawn to Queen
      if (
        figure.name === Figures.PAWN &&
        ((figure.color === Colors.WHITE && y === 8) ||
          (figure.color === Colors.BLACK && y === 1))
      ) {
        dispatch(promoteFigure({ id: figure.id, name: Figures.QUEEN }));
      }
    },
    [dispatch]
  );

  const moveOrEat = useCallback(
    (figure, x, y) => {
      const currentFigures = store.getState().game.figures;
      let targetPiece = null;
      for (const id in currentFigures) {
        if (currentFigures[id].x === x && currentFigures[id].y === y) {
          targetPiece = currentFigures[id];
          break;
        }
      }

      if (targetPiece && targetPiece.color !== figure.color) {
        eatFigure(targetPiece);
      }
      moveOn(figure, x, y);
    },
    [eatFigure, moveOn]
  );

  // Player 2 (Black) Computer Move
  const executeComputerMove = useCallback(() => {
    if (gameWon) return;

    setIsComputerThinking(true);

    setTimeout(() => {
      const currentFigures = store.getState().game.figures;
      const legalMoves = getAllLegalMoves(currentFigures, Colors.BLACK);

      if (legalMoves.length === 0) {
        endGame(Colors.WHITE);
        setIsComputerThinking(false);
        return;
      }

      // Computer selects from top tactical legal moves with slight variation
      const topCandidates = legalMoves.slice(0, Math.min(3, legalMoves.length));
      const chosen =
        topCandidates[Math.floor(Math.random() * topCandidates.length)];

      moveOrEat(chosen.figure, chosen.x, chosen.y);

      setCurrentTurn(Colors.WHITE);
      setIsComputerThinking(false);
    }, 450);
  }, [endGame, gameWon, moveOrEat]);

  const onWhiteMoveComplete = useCallback(() => {
    setCurrentTurn(Colors.BLACK);
    executeComputerMove();
  }, [executeComputerMove]);

  // Jev AI Advisor: Evaluates White's position to recommend next step
  const fetchJevAdvice = useCallback(async () => {
    if (gameWon) return;
    setIsAdvisorLoading(true);
    setAdvisorError(null);

    try {
      const currentFigures = store.getState().game.figures;
      const decision = await decideJevMove(currentFigures, Colors.WHITE);
      setJevDecision(decision);
    } catch (err) {
      console.error("Error fetching Jev advice:", err);
      setAdvisorError("Failed to fetch advice. Check API key in .env.");
    } finally {
      setIsAdvisorLoading(false);
    }
  }, [gameWon]);

  // Trigger Jev advice whenever it is White's turn
  useEffect(() => {
    if (currentTurn === Colors.WHITE && !gameWon) {
      fetchJevAdvice();
    }
  }, [currentTurn, gameWon, fetchJevAdvice]);

  const cellClicked = (x, y) => {
    if (isComputerThinking || currentTurn !== Colors.WHITE) return;
    if (!choseFigurePos) return;
    if (!choseFigurePos.availableCells[`${x}-${y}`]) return;

    moveOn(choseFigurePos.figure, x, y);
    onWhiteMoveComplete();
  };

  const isSelectedCell = (x, y) => {
    if (!choseFigurePos) return false;
    return choseFigurePos.figure.x === x && choseFigurePos.figure.y === y;
  };

  const initCells = () => {
    const boxes = [];
    for (let y = 8; y >= 1; y--) {
      for (let x = 1; x <= 8; x++) {
        const uniqueKey = uuidv4();
        const boardLetter = BoardNumber[x];
        boxes.push(
          <Boxes
            color={(y + x) % 2 === 0 ? Colors.BLACK : Colors.WHITE}
            key={uniqueKey}
            x={boardLetter}
            y={y}
            isAvailableForMove={isAvailableCellForMove(x, y)}
            isHavingFigure={isCellHavingFigure(x, y)}
            cellClicked={cellClicked}
            isSelected={isSelectedCell(x, y)}
          />
        );
      }
    }
    return boxes;
  };

  const isEatableFigure = (figure) => {
    if (!choseFigurePos) return false;
    return choseFigurePos.availableCells[`${figure.x}-${figure.y}`];
  };

  const isSelectedFigure = (figure) => {
    if (!choseFigurePos) return false;
    return choseFigurePos.figure.id === figure.id;
  };

  const initFigures = () => {
    const figuresJSX = [];

    for (let item in figures) {
      if (!figures[item].id || !figures[item].color) continue;
      figuresJSX.push(
        <Figure
          figureClicked={figureClicked}
          key={figures[item].id}
          figure={figures[item]}
          isEatable={isEatableFigure(figures[item])}
          isSelected={isSelectedFigure(figures[item])}
        />
      );
    }

    return figuresJSX;
  };

  const figureClicked = (figure) => {
    if (isComputerThinking) return;

    // Human player making capture
    if (
      choseFigurePos &&
      choseFigurePos.availableCells[`${figure.x}-${figure.y}`] &&
      choseFigurePos.figure.color !== figure.color
    ) {
      moveOrEat(choseFigurePos.figure, figure.x, figure.y);
      onWhiteMoveComplete();
      return;
    }

    // Deselect
    if (
      choseFigurePos &&
      choseFigurePos.figure.name === figure.name &&
      figure.x === choseFigurePos.figure.x &&
      choseFigurePos.figure.y === figure.y &&
      choseFigurePos.figure.color === figure.color
    ) {
      setChoseFigurePos(null);
      return;
    }

    // Only allow selecting White (human) pieces on White's turn
    if (currentTurn !== Colors.WHITE || figure.color !== Colors.WHITE) return;

    if (isKingInCheck && figure.name !== Figures.KING) return;

    setChoseFigurePos({
      figure,
      availableCells: getAvailableCells(figure, figures),
    });
  };

  const handleApplyJevMove = (candidate) => {
    if (currentTurn !== Colors.WHITE || isComputerThinking || gameWon) return;
    const currentFigures = store.getState().game.figures;
    const figureToMove = currentFigures[candidate.figure.id];
    if (!figureToMove) return;

    moveOrEat(figureToMove, candidate.x, candidate.y);
    onWhiteMoveComplete();
  };

  const getFiguresBySide = (color) => {
    return Object.keys(figures)
      .filter((figureId) => figures[figureId].color === color)
      .map((figureId) => figures[figureId]);
  };

  const updateAllAvailableCells = () => {
    dangerousCells.current.white = {};
    dangerousCells.current.black = {};
    const whiteFigures = getFiguresBySide(Colors.WHITE);
    const blackFigures = getFiguresBySide(Colors.BLACK);
    whiteFigures.forEach((figure) => {
      dangerousCells.current.white = {
        ...dangerousCells.current.white,
        ...getAvailableCells(figure, figures, true),
      };
    });
    blackFigures.forEach((figure) => {
      dangerousCells.current.black = {
        ...dangerousCells.current.black,
        ...getAvailableCells(figure, figures, true),
      };
    });
  };

  const checkIsKingInCheck = (color) => {
    updateAllAvailableCells();
    const kings = {
      [Colors.WHITE]: figures["white-king-5-1"],
      [Colors.BLACK]: figures["black-king-5-8"],
    };
    const king = kings[color];
    if (!king) return;
    if (dangerousCells.current[getOtherColor(color)][`${king.x}-${king.y}`]) {
      setIsKingInCheck(true);
    } else {
      setIsKingInCheck(false);
    }
  };

  const newGameStart = () => {
    dispatch(resetGame());
    dispatch(setGameStarted(true));
    setCurrentTurn(Colors.WHITE);
    setChoseFigurePos(null);
    setJevDecision(null);
    setAdvisorError(null);
    setIsComputerThinking(false);
  };

  const getGameWonJSX = () => {
    if (!gameWon) return null;
    const color = gameWon[0].toUpperCase() + gameWon.slice(1);

    return (
      <div className={styles.gameWon}>
        <img className={styles.chessLogo} src={chessLogo} alt="Chess logo" />
        <h1>{color} won!</h1>
        <button onClick={newGameStart} className={styles.newGameButton}>
          New Match
        </button>
        <ConfettiExplosion
          blast={true}
          duration={5000}
          recycle={false}
          force={1.2}
          width={1800}
          gravity={0.3}
          colors={[
            "#ff0000",
            "#00ff00",
            "#0000ff",
            "#ffff00",
            "#ffa500",
            "#ffc0cb",
          ]}
        />
      </div>
    );
  };

  useEffect(() => {
    checkIsKingInCheck(sides.ally);
  }, [figures]);

  const isWhiteTurn = currentTurn === Colors.WHITE;

  return (
    <div className={styles.gameContainer}>
      <div className={styles.dashboardHeader}>
        <div className={styles.titleSection}>
          <h1 className={styles.gameTitle}>
            React Chess <span className={styles.jevBadge}>Jev Advisor</span>
          </h1>
          <p className={styles.gameSubtitle}>
            {gameWon
              ? "Game Over"
              : isComputerThinking
              ? "Player 2 (Computer) is moving..."
              : isWhiteTurn
              ? "Your turn (White) · Jev recommends your next move"
              : "Waiting for move..."}
          </p>
        </div>
        <div className={styles.controls}>
          <span className={styles.controlBtn}>
            P1: You (White) vs P2: Computer
          </span>
          <button
            className={`${styles.controlBtn} ${styles.reset}`}
            onClick={newGameStart}
          >
            Restart
          </button>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <div className={styles.boardColumn}>
          <div
            className={`${styles.statusBar} ${
              isComputerThinking ? styles.thinking : ""
            }`}
          >
            <div className={styles.statusLeft}>
              <div
                className={`${styles.statusIndicator} ${
                  isComputerThinking ? styles.pulsing : ""
                }`}
              />
              <span>
                {gameWon
                  ? `${gameWon[0].toUpperCase() + gameWon.slice(1)} won!`
                  : isComputerThinking
                  ? "Computer is making its move..."
                  : isWhiteTurn
                  ? "Your turn (White). Move on board or click Play in Jev panel."
                  : "Black's turn."}
              </span>
            </div>

            {jevDecision && isWhiteTurn && (
              <div className={styles.statusMeta}>
                <span>
                  Jev Hint:{" "}
                  <strong>
                    {jevDecision.candidate.fromSquare} →{" "}
                    {jevDecision.candidate.toSquare}
                  </strong>
                </span>
                <span className={styles.confidencePill}>
                  {Math.round(jevDecision.confidence * 100)}%
                </span>
              </div>
            )}
          </div>

          <div
            className={styles.boardWrapper}
            ref={boardRef}
            style={{ cursor: isComputerThinking ? "wait" : undefined }}
          >
            <ul className={styles.boardLeft}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((number, index) => (
                <li
                  key={number}
                  className={`${styles.boardLeftItem} ${
                    index % 2 === 0 ? styles.colorWhite : styles.colorBlack
                  }`}
                >
                  {number}
                </li>
              ))}
            </ul>

            <ul className={styles.boardBottom}>
              {["A", "B", "C", "D", "E", "F", "G", "H"].map((letter, index) => (
                <li
                  key={letter}
                  className={`${styles.boardBottomItem} ${
                    index % 2 === 0 ? styles.colorWhite : styles.colorBlack
                  }`}
                >
                  {letter}
                </li>
              ))}
            </ul>

            <ul className={styles.boxes}>
              {initCells()}
              {initFigures()}
            </ul>
            {getGameWonJSX()}
          </div>
        </div>

        <JevAdvisor
          decision={jevDecision}
          isLoading={isAdvisorLoading}
          error={advisorError}
          currentTurn={currentTurn}
          figures={figures}
          gameWon={gameWon}
          onApplyMove={handleApplyJevMove}
          onRefresh={fetchJevAdvice}
        />
      </div>
    </div>
  );
}

export default Board;
