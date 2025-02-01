'use client'

import { useState } from 'react';
import ChessPiece from './ChessPiece';
import { Square, EnPassantState, DrawReason, CastlingRights, PromotionPiece, PromotionState, Piece } from '@/types/chess';
import { getBoardState, hasInsufficientMaterial, hasValidMoves, initializeBoard, isSquareUnderAttack, isValidBishopMove, isValidKnightMove, isValidPawnMove, isValidQueenMove, isValidRookMove, isValidKingMove } from '@/utils/chessRules';

export default function ChessBoard() {
  const [board, setBoard] = useState<Square[][]>(initializeBoard());
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [enPassant, setEnPassant] = useState<EnPassantState>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  const [inCheck, setInCheck] = useState<'white' | 'black' | null>(null);
  const [checkmate, setCheckmate] = useState<'white' | 'black' | null>(null);
  const [isDraw, setIsDraw] = useState<boolean>(false);
  const [drawReason, setDrawReason] = useState<DrawReason>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [movesSinceCaptureOrPawn, setMovesSinceCaptureOrPawn] = useState<number>(0);
  const [castlingRights, setCastlingRights] = useState<CastlingRights>({
    whiteKingMoved: false,
    whiteKingRookMoved: false,
    whiteQueenRookMoved: false,
    blackKingMoved: false,
    blackKingRookMoved: false,
    blackQueenRookMoved: false,
  });
  const [promotionState, setPromotionState] = useState<PromotionState>(null);

  const calculateValidMoves = (row: number, col: number, piece: Piece): string[] => {
    const moves: string[] = [];
    
    // Check all possible squares on the board
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let isValid = false;
        
        switch (piece.type) {
          case 'pawn':
            isValid = isValidPawnMove(row, col, i, j, piece, board, enPassant);
            break;
          case 'king':
            isValid = isValidKingMove(row, col, i, j, piece, board, castlingRights);
            break;
          case 'rook':
            isValid = isValidRookMove(row, col, i, j, piece, board);
            break;
          case 'knight':
            isValid = isValidKnightMove(row, col, i, j, piece, board);
            break;
          case 'bishop':
            isValid = isValidBishopMove(row, col, i, j, piece, board);
            break;
          case 'queen':
            isValid = isValidQueenMove(row, col, i, j, piece, board);
            break;
        }

        if (isValid) {
          moves.push(`${i},${j}`);
        }
      }
    }
    return moves;
  };

  const isKingInCheckOnBoard = (color: 'white' | 'black', testBoard: Square[][]): boolean => {
    // Find king position on the test board
    let kingRow = -1, kingCol = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = testBoard[i][j].piece;
        if (piece?.type === 'king' && piece.color === color) {
          kingRow = i;
          kingCol = j;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Check if any opponent's piece can attack the king's position
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = testBoard[i][j].piece;
        if (piece && piece.color !== color) {
          let isValidAttack = false;
          
          switch (piece.type) {
            case 'pawn':
              const direction = piece.color === 'white' ? -1 : 1;
              if (Math.abs(kingCol - j) === 1 && kingRow - i === direction) {
                isValidAttack = true;
              }
              break;
            case 'knight':
              const rowDiff = Math.abs(kingRow - i);
              const colDiff = Math.abs(kingCol - j);
              isValidAttack = (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
              break;
            case 'bishop':
              if (Math.abs(kingRow - i) === Math.abs(kingCol - j)) {
                isValidAttack = true;
                // Check if path is clear
                const rowStep = kingRow > i ? 1 : -1;
                const colStep = kingCol > j ? 1 : -1;
                let currentRow = i + rowStep;
                let currentCol = j + colStep;
                while (currentRow !== kingRow) {
                  if (testBoard[currentRow][currentCol].piece) {
                    isValidAttack = false;
                    break;
                  }
                  currentRow += rowStep;
                  currentCol += colStep;
                }
              }
              break;
            case 'rook':
              if (kingRow === i || kingCol === j) {
                isValidAttack = true;
                // Check if path is clear
                if (kingRow === i) {
                  const step = kingCol > j ? 1 : -1;
                  for (let col = j + step; col !== kingCol; col += step) {
                    if (testBoard[i][col].piece) {
                      isValidAttack = false;
                      break;
                    }
                  }
                } else {
                  const step = kingRow > i ? 1 : -1;
                  for (let row = i + step; row !== kingRow; row += step) {
                    if (testBoard[row][j].piece) {
                      isValidAttack = false;
                      break;
                    }
                  }
                }
              }
              break;
            case 'queen':
              // Combine rook and bishop logic
              if (kingRow === i || kingCol === j || Math.abs(kingRow - i) === Math.abs(kingCol - j)) {
                isValidAttack = true;
                if (kingRow === i || kingCol === j) {
                  // Rook-like movement
                  if (kingRow === i) {
                    const step = kingCol > j ? 1 : -1;
                    for (let col = j + step; col !== kingCol; col += step) {
                      if (testBoard[i][col].piece) {
                        isValidAttack = false;
                        break;
                      }
                    }
                  } else {
                    const step = kingRow > i ? 1 : -1;
                    for (let row = i + step; row !== kingRow; row += step) {
                      if (testBoard[row][j].piece) {
                        isValidAttack = false;
                        break;
                      }
                    }
                  }
                } else {
                  // Bishop-like movement
                  const rowStep = kingRow > i ? 1 : -1;
                  const colStep = kingCol > j ? 1 : -1;
                  let currentRow = i + rowStep;
                  let currentCol = j + colStep;
                  while (currentRow !== kingRow) {
                    if (testBoard[currentRow][currentCol].piece) {
                      isValidAttack = false;
                      break;
                    }
                    currentRow += rowStep;
                    currentCol += colStep;
                  }
                }
              }
              break;
            case 'king':
              isValidAttack = Math.abs(kingRow - i) <= 1 && Math.abs(kingCol - j) <= 1;
              break;
          }
          
          if (isValidAttack) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isKingInCheck = (color: 'white' | 'black'): boolean => {
    return isKingInCheckOnBoard(color, board);
  };

  const wouldMoveExposeCheck = (
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    piece: Piece
  ): boolean => {
    // Create a deep copy of the board
    const tempBoard = JSON.parse(JSON.stringify(board));
    
    // Make the move on the temporary board
    tempBoard[toRow][toCol].piece = tempBoard[fromRow][fromCol].piece;
    tempBoard[fromRow][fromCol].piece = null;
    
    // Check if the king would be in check after this move
    return isKingInCheckOnBoard(piece.color, tempBoard);
  };


  const checkForThreefoldRepetition = (newBoardState: string): boolean => {
    const count = moveHistory.filter(state => state === newBoardState).length;
    return count >= 2; // Already occurred twice before (making it three times total)
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!selectedPiece) {
      const piece = board[row][col].piece;
      if (piece && piece.color === currentTurn) {
        setSelectedPiece(`${row},${col}`);
        // Only show valid moves that don't leave king in check
        const moves = calculateValidMoves(row, col, piece).filter(move => {
          const [toRow, toCol] = move.split(',').map(Number);
          return !wouldMoveExposeCheck(row, col, toRow, toCol, piece);
        });
        setValidMoves(moves);
      }
    } else {
      const [selectedRow, selectedCol] = selectedPiece.split(',').map(Number);
      const piece = board[selectedRow][selectedCol].piece;

      if (piece) {
        let isValidMove = false;

        switch (piece.type) {
          case 'pawn':
            isValidMove = isValidPawnMove(selectedRow, selectedCol, row, col, piece, board, enPassant);
            break;
          case 'king':
            isValidMove = isValidKingMove(selectedRow, selectedCol, row, col, piece, board, castlingRights);
            break;
          case 'rook':
            isValidMove = isValidRookMove(selectedRow, selectedCol, row, col, piece, board);
            break;
          case 'knight':
            isValidMove = isValidKnightMove(selectedRow, selectedCol, row, col, piece, board);
            break;
          case 'bishop':
            isValidMove = isValidBishopMove(selectedRow, selectedCol, row, col, piece, board);
            break;
          case 'queen':
            isValidMove = isValidQueenMove(selectedRow, selectedCol, row, col, piece, board);
            break;
        }

        if (!isValidMove || wouldMoveExposeCheck(selectedRow, selectedCol, row, col, piece)) {
          setSelectedPiece(null);
          setValidMoves([]);
          return;
        }

        const newBoard = [...board];

        if (piece.type === 'pawn') {
          // Handle en passant capture
          if (enPassant?.capturePosition === `${String.fromCharCode(97 + col)}${8 - row}`) {
            // Remove the captured pawn
            const capturedPawnCol = col;
            const capturedPawnRow = row + (piece.color === 'white' ? 1 : -1);
            newBoard[capturedPawnRow][capturedPawnCol].piece = null;
          }

          // Check if this is a two-square pawn move
          const isTwoSquareMove = Math.abs(row - selectedRow) === 2;
          if (isTwoSquareMove) {
            // Set up en passant for the next move
            const enPassantRow = row + (piece.color === 'white' ? 1 : -1);
            setEnPassant({
              pawnPosition: `${String.fromCharCode(97 + col)}${8 - row}`,
              capturePosition: `${String.fromCharCode(97 + col)}${8 - enPassantRow}`
            });
          } else {
            // Clear en passant if it's not a two-square move
            setEnPassant(null);
          }

          newBoard[row][col].piece = piece;
          newBoard[selectedRow][selectedCol].piece = null;
          
          // Check for pawn promotion
          const isPromotion = (piece.color === 'white' && row === 0) || (piece.color === 'black' && row === 7);
          if (isPromotion) {
            setPromotionState({
              pawnPosition: { row, col },
              color: piece.color
            });
            setBoard(newBoard); // Just update the board, don't switch turns yet
          } else {
            setBoard(newBoard);
            // Update move counters and history
            const isCapture = board[row][col].piece !== null;
            const isPawnMove = piece.type === 'pawn';
            
            if (isCapture || isPawnMove) {
              setMovesSinceCaptureOrPawn(0);
            } else {
              setMovesSinceCaptureOrPawn(prev => prev + 1);
            }

            const newBoardState = getBoardState(board);
            setMoveHistory(prev => [...prev, newBoardState]);

            // Check for draws
            if (movesSinceCaptureOrPawn >= 100) { // 50 moves by each player
              setIsDraw(true);
              setDrawReason('fifty-moves');
            } else if (checkForThreefoldRepetition(newBoardState)) {
              setIsDraw(true);
              setDrawReason('threefold-repetition');
            } else if (hasInsufficientMaterial(board)) {
              setIsDraw(true);
              setDrawReason('insufficient-material');
            } else {
              const opponentColor = currentTurn === 'white' ? 'black' : 'white';
              const isOpponentInCheck = isKingInCheck(opponentColor);
              
              if (!isOpponentInCheck && !hasValidMoves(opponentColor, board, castlingRights)) {
                setIsDraw(true);
                setDrawReason('stalemate');
              }
            }

            // Check if the move puts the opponent in check or checkmate
            const opponentColor = currentTurn === 'white' ? 'black' : 'white';
            const isOpponentInCheck = isKingInCheck(opponentColor);
            
            if (isOpponentInCheck) {
              setInCheck(opponentColor);
              
              // Check for checkmate
              if (!hasValidMoves(opponentColor, board, castlingRights)) {
                setCheckmate(opponentColor);
              }
            } else {
              setInCheck(null);
            }

            // Switch turns after a valid move
            setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
          }
        } else if (piece.type === 'king') {
          // Update castling rights
          setCastlingRights(prev => ({
            ...prev,
            [piece.color === 'white' ? 'whiteKingMoved' : 'blackKingMoved']: true
          }));

          // Check if this is a castling move
          if (Math.abs(col - selectedCol) === 2) {
            const isKingSide = col > selectedCol;
            const row = piece.color === 'white' ? 7 : 0;
            const rookFromCol = isKingSide ? 7 : 0;
            const rookToCol = isKingSide ? col - 1 : col + 1;
            
            // Move the rook
            newBoard[row][rookToCol].piece = newBoard[row][rookFromCol].piece;
            newBoard[row][rookFromCol].piece = null;
          }

          // Move the king
          newBoard[row][col].piece = piece;
          newBoard[selectedRow][selectedCol].piece = null;
          setBoard(newBoard);
          setEnPassant(null);
        } else if (piece.type === 'rook') {
          // Update castling rights for rooks
          if (piece.color === 'white') {
            if (selectedRow === 7 && selectedCol === 0) {
              setCastlingRights(prev => ({ ...prev, whiteQueenRookMoved: true }));
            } else if (selectedRow === 7 && selectedCol === 7) {
              setCastlingRights(prev => ({ ...prev, whiteKingRookMoved: true }));
            }
          } else {
            if (selectedRow === 0 && selectedCol === 0) {
              setCastlingRights(prev => ({ ...prev, blackQueenRookMoved: true }));
            } else if (selectedRow === 0 && selectedCol === 7) {
              setCastlingRights(prev => ({ ...prev, blackKingRookMoved: true }));
            }
          }

          // Move the rook
          newBoard[row][col].piece = piece;
          newBoard[selectedRow][selectedCol].piece = null;
          setBoard(newBoard);
          setEnPassant(null);
        } else {
          // Handle all other pieces (knight, bishop, queen)
          newBoard[row][col].piece = piece;
          newBoard[selectedRow][selectedCol].piece = null;
          setBoard(newBoard);
          setEnPassant(null);
        }

        // Update move counters and history
        const isCapture = board[row][col].piece !== null;
        const isPawnMove = piece.type === 'pawn';
        
        if (isCapture || isPawnMove) {
          setMovesSinceCaptureOrPawn(0);
        } else {
          setMovesSinceCaptureOrPawn(prev => prev + 1);
        }

        const newBoardState = getBoardState(board);
        setMoveHistory(prev => [...prev, newBoardState]);

        // Check for draws
        if (movesSinceCaptureOrPawn >= 100) { // 50 moves by each player
          setIsDraw(true);
          setDrawReason('fifty-moves');
        } else if (checkForThreefoldRepetition(newBoardState)) {
          setIsDraw(true);
          setDrawReason('threefold-repetition');
        } else if (hasInsufficientMaterial(board)) {
          setIsDraw(true);
          setDrawReason('insufficient-material');
        } else {
          const opponentColor = currentTurn === 'white' ? 'black' : 'white';
          const isOpponentInCheck = isKingInCheck(opponentColor);
          
          if (!isOpponentInCheck && !hasValidMoves(opponentColor, board, castlingRights)) {
            setIsDraw(true);
            setDrawReason('stalemate');
          }
        }

        // Check if the move puts the opponent in check or checkmate
        const opponentColor = currentTurn === 'white' ? 'black' : 'white';
        const isOpponentInCheck = isKingInCheck(opponentColor);
        
        if (isOpponentInCheck) {
          setInCheck(opponentColor);
          
          // Check for checkmate
          if (!hasValidMoves(opponentColor, board, castlingRights)) {
            setCheckmate(opponentColor);
          }
        } else {
          setInCheck(null);
        }

        // Switch turns after a valid move
        setCurrentTurn(currentTurn === 'white' ? 'black' : 'white');
      }
      setValidMoves([]);
      setSelectedPiece(null);
    }
  };

  const handlePromotion = (pieceType: PromotionPiece) => {
    if (!promotionState) return;

    const newBoard = [...board];
    newBoard[promotionState.pawnPosition.row][promotionState.pawnPosition.col].piece = {
      type: pieceType,
      color: promotionState.color
    };
    setBoard(newBoard);

    // Update move counters and history
    setMovesSinceCaptureOrPawn(0); // Pawn move/promotion resets the counter
    const newBoardState = getBoardState(board);
    setMoveHistory(prev => [...prev, newBoardState]);

    // Check for draws
    if (hasInsufficientMaterial(board)) {
      setIsDraw(true);
      setDrawReason('insufficient-material');
    }

    // Check if the promotion puts the opponent in check or checkmate
    const opponentColor = currentTurn === 'white' ? 'black' : 'white';
    const isOpponentInCheck = isKingInCheck(opponentColor);
    
    if (isOpponentInCheck) {
      setInCheck(opponentColor);
      
      // Check for checkmate
      if (!hasValidMoves(opponentColor, board, castlingRights)) {
        setCheckmate(opponentColor);
      }
    } else {
      setInCheck(null);
    }

    setPromotionState(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`text-xl font-bold ${inCheck === currentTurn ? 'text-red-600' : ''}`}>
        {checkmate ? (
          <span className="text-red-600">
            Checkmate! {checkmate === 'white' ? 'Black' : 'White'} wins!
          </span>
        ) : isDraw ? (
          <span className="text-blue-600">
            Draw by {
              drawReason === 'stalemate' ? 'stalemate' :
              drawReason === 'insufficient-material' ? 'insufficient material' :
              drawReason === 'threefold-repetition' ? 'threefold repetition' :
              'fifty-move rule'
            }
          </span>
        ) : (
          <>
            {currentTurn === 'white' ? "White's Turn" : "Black's Turn"}
            {inCheck && ` • ${inCheck === 'white' ? 'White' : 'Black'} is in Check`}
          </>
        )}
      </div>
      <div className="grid grid-cols-8 w-[640px] h-[640px] border-2 border-gray-800">
        {board.map((row, i) =>
          row.map((square, j) => {
            const isWhiteSquare = (i + j) % 2 === 0;
            const isSelected = selectedPiece === `${i},${j}`;
            const isValidMove = validMoves.includes(`${i},${j}`);
            
            return (
              <div
                key={`${i}-${j}`}
                className={`
                  w-20 h-20 flex items-center justify-center
                  ${isWhiteSquare ? 'bg-white' : 'bg-gray-800'}
                  ${isSelected ? 'bg-yellow-200' : ''}
                  ${isValidMove ? 'bg-green-200' : ''}
                  ${isValidMove && square.piece ? 'bg-red-200' : ''}
                  cursor-pointer
                  relative
                `}
                onClick={() => handleSquareClick(i, j)}
              >
                {square.piece && (
                  <ChessPiece type={square.piece.type} color={square.piece.color} />
                )}
                {isValidMove && (
                  <div className="absolute w-3 h-3 rounded-full bg-gray-400 opacity-50" />
                )}
              </div>
            );
          })
        )}
      </div>
      {(checkmate || isDraw) && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            setBoard(initializeBoard());
            setSelectedPiece(null);
            setEnPassant(null);
            setValidMoves([]);
            setCurrentTurn('white');
            setInCheck(null);
            setCheckmate(null);
            setIsDraw(false);
            setDrawReason(null);
            setMoveHistory([]);
            setMovesSinceCaptureOrPawn(0);
            setCastlingRights({
              whiteKingMoved: false,
              whiteKingRookMoved: false,
              whiteQueenRookMoved: false,
              blackKingMoved: false,
              blackKingRookMoved: false,
              blackQueenRookMoved: false,
            });
          }}
        >
          New Game
        </button>
      )}
      
      {/* Promotion Modal */}
      {promotionState && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">Choose promotion piece:</h2>
            <div className="flex gap-4">
              {(['queen', 'rook', 'bishop', 'knight'] as const).map((pieceType) => (
                <button
                  key={pieceType}
                  className="w-16 h-16 flex items-center justify-center border rounded hover:bg-gray-100"
                  onClick={() => handlePromotion(pieceType)}
                >
                  <ChessPiece
                    type={pieceType}
                    color={promotionState.color}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 