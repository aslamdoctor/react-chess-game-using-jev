import React from "react";
import PropTypes from "prop-types";
import styles from "./JevAdvisor.module.css";
import { Colors } from "../../config";
import { getMaterialSummary } from "../../services/jevChessService";

function JevAdvisor({
  decision,
  isLoading,
  error,
  currentTurn,
  figures,
  gameWon,
  onApplyMove,
  onRefresh,
}) {
  const isWhiteTurn = currentTurn === Colors.WHITE;
  const material = getMaterialSummary(figures);
  const materialDiff = material.white.score - material.black.score;
  const materialDiffText =
    materialDiff > 0
      ? `+${materialDiff} (White leading)`
      : materialDiff < 0
      ? `${materialDiff} (Black leading)`
      : "Even (39 - 39)";

  // Sort probability entries descending
  const sortedProbabilities = decision?.probabilities
    ? Object.entries(decision.probabilities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    : [];

  const confidencePercent = decision ? Math.round(decision.confidence * 100) : 0;

  return (
    <aside className={styles.advisorContainer} aria-label="Jev AI Advisor">
      <div className={styles.advisorHeader}>
        <h2 className={styles.headerTitle}>
          Jev Advisor <span className={styles.jevPill}>System One</span>
        </h2>
        <div
          className={`${styles.statusPill} ${
            isLoading
              ? styles.analyzing
              : isWhiteTurn
              ? styles.ready
              : ""
          }`}
        >
          <span
            className={`${styles.dot} ${isLoading ? styles.pulsing : ""}`}
          />
          <span>
            {isLoading
              ? "Analyzing..."
              : isWhiteTurn
              ? "Advice Ready"
              : "Computer Turn"}
          </span>
        </div>
      </div>

      {decision && !isLoading ? (
        <>
          <div className={styles.recommendationCard}>
            <div className={styles.recommendationHeader}>
              <span className={styles.tagLabel}>Jev Recommendation</span>
              <span className={styles.tagLabel}>White (You)</span>
            </div>

            <div className={styles.moveHighlight}>
              {decision.candidate?.fromSquare} → {decision.candidate?.toSquare}
            </div>

            <p className={styles.reasoningText}>{decision.reasoning}</p>

            <div className={styles.confidenceSection}>
              <div className={styles.confidenceHeader}>
                <span>Model Confidence</span>
                <span className={styles.confidenceVal}>
                  {confidencePercent}%
                </span>
              </div>
              <div className={styles.progressBarBg}>
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${Math.max(confidencePercent, 8)}%` }}
                />
              </div>
            </div>

            <button
              className={styles.applyBtn}
              onClick={() => onApplyMove && onApplyMove(decision.candidate)}
              disabled={!isWhiteTurn || Boolean(gameWon)}
              title="Execute Jev's recommended move on the board"
            >
              Play {decision.candidate?.fromSquare} → {decision.candidate?.toSquare}
            </button>
          </div>

          {sortedProbabilities.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                How Jev Evaluated Options
              </h3>
              <div className={styles.probabilitiesList}>
                {sortedProbabilities.map(([moveKey, prob]) => {
                  const pct = Math.round(prob * 100);
                  return (
                    <div key={moveKey} className={styles.probItem}>
                      <div className={styles.probItemHeader}>
                        <span className={styles.probMoveName}>{moveKey}</span>
                        <span className={styles.probPercent}>{pct}%</span>
                      </div>
                      <div className={styles.probMiniBarBg}>
                        <div
                          className={styles.probMiniBarFill}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Decision Telemetry</h3>
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Material</span>
                <span className={styles.statValue}>{materialDiffText}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Legal Moves</span>
                <span className={styles.statValue}>
                  {decision.candidatesCount || 0} evaluated
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Decision Source</span>
                <span className={styles.statValue}>
                  {decision.source === "jev"
                    ? "jev-latest"
                    : decision.source}
                </span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statLabel}>Token Usage</span>
                <span className={styles.statValue}>
                  {decision.usage
                    ? `${decision.usage.input_tokens} in / ${decision.usage.output_tokens} out`
                    : "Cache / Local"}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : isLoading ? (
        <div className={styles.emptyState}>
          <p>Jev is evaluating legal options and calculating probabilities...</p>
        </div>
      ) : error ? (
        <div className={styles.emptyState}>
          <p style={{ color: "#ef4444" }}>{error}</p>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>Make a move or click Refresh to get Jev&apos;s advice.</p>
        </div>
      )}

      <div className={styles.footerActions}>
        <button
          className={styles.secondaryBtn}
          onClick={onRefresh}
          disabled={isLoading || Boolean(gameWon)}
        >
          Re-Analyze Position
        </button>
      </div>
    </aside>
  );
}

JevAdvisor.propTypes = {
  decision: PropTypes.shape({
    candidate: PropTypes.shape({
      fromSquare: PropTypes.string,
      toSquare: PropTypes.string,
      figure: PropTypes.object,
      x: PropTypes.number,
      y: PropTypes.number,
      description: PropTypes.string,
    }),
    choiceKey: PropTypes.string,
    confidence: PropTypes.number,
    probabilities: PropTypes.object,
    source: PropTypes.string,
    reasoning: PropTypes.string,
    candidatesCount: PropTypes.number,
    usage: PropTypes.shape({
      input_tokens: PropTypes.number,
      output_tokens: PropTypes.number,
    }),
  }),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  currentTurn: PropTypes.string.isRequired,
  figures: PropTypes.object.isRequired,
  gameWon: PropTypes.string,
  onApplyMove: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

JevAdvisor.defaultProps = {
  decision: null,
  isLoading: false,
  error: null,
  gameWon: null,
};

export default JevAdvisor;
