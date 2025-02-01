import { Piece, Square, EnPassantState, CastlingRights } from '../types/chess';

export const isValidPawnMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][],
  enPassant: { pawnPosition: string | null; capturePosition: string | null; } | null
): boolean => {
  const direction = piece.color === 'white' ? -1 : 1;
  const startingRow = piece.color === 'white' ? 6 : 1;
  
  const rowDiff = toRow - fromRow;
  const colDiff = Math.abs(toCol - fromCol);

  // En passant capture
  if (enPassant) {
    const targetPosition = `${String.fromCharCode(97 + toCol)}${8 - toRow}`;
    if (
      rowDiff === direction &&
      colDiff === 1 &&
      targetPosition === enPassant.capturePosition &&
      !board[toRow][toCol].piece
    ) {
      return true;
    }
  }

  // Regular diagonal capture
  if (
    rowDiff === direction &&
    colDiff === 1 &&
    board[toRow][toCol].piece &&
    board[toRow][toCol].piece?.color !== piece.color
  ) {
    return true;
  }

  // Basic forward movement (one square)
  if (colDiff === 0 && rowDiff === direction && !board[toRow][toCol].piece) {
    return true;
  }

  // First move - can move two squares
  if (
    fromRow === startingRow &&
    colDiff === 0 &&
    rowDiff === direction * 2 &&
    !board[toRow][toCol].piece &&
    !board[fromRow + direction][fromCol].piece
  ) {
    return true;
  }

  return false;
};

export const isValidRookMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][]
): boolean => {
  // Rook must move either horizontally or vertically
  if (fromRow !== toRow && fromCol !== toCol) {
    return false;
  }

  // Check if target square has our own piece
  const targetPiece = board[toRow][toCol].piece;
  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  // Check if path is clear
  if (fromRow === toRow) {
    // Horizontal movement
    const start = Math.min(fromCol, toCol);
    const end = Math.max(fromCol, toCol);
    for (let col = start + 1; col < end; col++) {
      if (board[fromRow][col].piece) {
        return false; // Path is blocked
      }
    }
  } else {
    // Vertical movement
    const start = Math.min(fromRow, toRow);
    const end = Math.max(fromRow, toRow);
    for (let row = start + 1; row < end; row++) {
      if (board[row][fromCol].piece) {
        return false; // Path is blocked
      }
    }
  }

  return true;
};

export const isValidKnightMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][]
): boolean => {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Knight must move in an L-shape
  if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) {
    return false;
  }

  // Check if target square is empty or has an opponent's piece
  const targetPiece = board[toRow][toCol].piece;
  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  return true;
};

export const isValidBishopMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][]
): boolean => {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // Bishop must move diagonally
  if (rowDiff !== colDiff) {
    return false;
  }

  // Check if target square has our own piece
  const targetPiece = board[toRow][toCol].piece;
  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  // Check if path is clear
  const rowDirection = toRow > fromRow ? 1 : -1;
  const colDirection = toCol > fromCol ? 1 : -1;

  let currentRow = fromRow + rowDirection;
  let currentCol = fromCol + colDirection;
  while (currentRow !== toRow && currentCol !== toCol) {
    if (board[currentRow][currentCol].piece) {
      return false; // Path is blocked
    }
    currentRow += rowDirection;
    currentCol += colDirection;
  }

  return true;
};

export const isValidQueenMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][]
): boolean => {
  // Queen combines rook and bishop movements
  return (
    isValidRookMove(fromRow, fromCol, toRow, toCol, piece, board) ||
    isValidBishopMove(fromRow, fromCol, toRow, toCol, piece, board)
  );
};

export const isValidKingMove = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][],
  castlingRights: CastlingRights,
): boolean => {
  // Check for castling first
  if (isValidCastling(fromRow, fromCol, toRow, toCol, piece, board, castlingRights, 
    (color) => isSquareUnderAttack(fromRow, fromCol, color, board))) {
    return true;
  }

  // Calculate the absolute difference in rows and columns
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);

  // King can move only one square in any direction
  if (rowDiff > 1 || colDiff > 1) {
    return false;
  }

  // Check if target square is empty or has an opponent's piece
  const targetPiece = board[toRow][toCol].piece;
  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  // Cannot move into check
  if (isSquareUnderAttack(toRow, toCol, piece.color, board)) {
    return false;
  }

  return true;
};

export const isSquareUnderAttack = (
  row: number,
  col: number,
  defendingColor: 'white' | 'black',
  board: Square[][]
): boolean => {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j].piece;
      if (piece && piece.color !== defendingColor) {
        let isValidAttack = false;
        
        switch (piece.type) {
          case 'pawn':
            const direction = piece.color === 'white' ? -1 : 1;
            if (Math.abs(col - j) === 1 && row - i === direction) {
              isValidAttack = true;
            }
            break;
          case 'knight':
            isValidAttack = isValidKnightMove(i, j, row, col, piece, board);
            break;
          case 'bishop':
            isValidAttack = isValidBishopMove(i, j, row, col, piece, board);
            break;
          case 'rook':
            isValidAttack = isValidRookMove(i, j, row, col, piece, board);
            break;
          case 'queen':
            isValidAttack = isValidQueenMove(i, j, row, col, piece, board);
            break;
          case 'king':
            isValidAttack = Math.abs(row - i) <= 1 && Math.abs(col - j) <= 1;
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

export const isValidCastling = (
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  piece: Piece,
  board: Square[][],
  castlingRights: CastlingRights,
  isKingInCheck: (color: 'white' | 'black') => boolean
): boolean => {
  // Must be a king
  if (piece.type !== 'king') return false;

  // Must be on the correct starting row
  const correctRow = piece.color === 'white' ? 7 : 0;
  if (fromRow !== correctRow || toRow !== correctRow) return false;

  // Must be moving from the correct starting column
  if (fromCol !== 4) return false;

  // Must move exactly two squares horizontally
  if (Math.abs(toCol - fromCol) !== 2) return false;

  const isKingSide = toCol > fromCol;

  // Check castling rights
  if (piece.color === 'white') {
    if (castlingRights.whiteKingMoved) return false;
    if (isKingSide && castlingRights.whiteKingRookMoved) return false;
    if (!isKingSide && castlingRights.whiteQueenRookMoved) return false;
  } else {
    if (castlingRights.blackKingMoved) return false;
    if (isKingSide && castlingRights.blackKingRookMoved) return false;
    if (!isKingSide && castlingRights.blackQueenRookMoved) return false;
  }

  // Check if the rook is in the correct position
  const rookCol = isKingSide ? 7 : 0;
  const rook = board[fromRow][rookCol].piece;
  if (!rook || rook.type !== 'rook' || rook.color !== piece.color) return false;

  // Check if the path between king and rook is clear
  const pathStart = Math.min(fromCol + 1, toCol);
  const pathEnd = Math.max(fromCol - 1, toCol);
  for (let col = pathStart; col <= pathEnd; col++) {
    if (board[fromRow][col].piece) return false;
  }

  // Check if the king is currently in check
  if (isKingInCheck(piece.color)) return false;

  // Check if the king passes through or ends up on a square under attack
  const direction = isKingSide ? 1 : -1;
  for (let col = fromCol; col !== toCol + direction; col += direction) {
    if (isSquareUnderAttack(fromRow, col, piece.color, board)) return false;
  }

  return true;
};

export const initializeBoard = (): Square[][] => {
  const board: Square[][] = [];
  
  for (let i = 0; i < 8; i++) {
    board[i] = [];
    for (let j = 0; j < 8; j++) {
      const position = `${String.fromCharCode(97 + j)}${8 - i}`;
      board[i][j] = { piece: null, position };
    }
  }

  // Initialize pawns
  for (let j = 0; j < 8; j++) {
    board[1][j].piece = { type: 'pawn', color: 'black' };
    board[6][j].piece = { type: 'pawn', color: 'white' };
  }

  // Initialize other pieces
  const pieceOrder: ('rook' | 'knight' | 'bishop' | 'queen' | 'king')[] = 
    ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let j = 0; j < 8; j++) {
    board[0][j].piece = { type: pieceOrder[j], color: 'black' };
    board[7][j].piece = { type: pieceOrder[j], color: 'white' };
  }

  return board;
};

export const hasInsufficientMaterial = (board: Square[][]): boolean => {
  let whitePieces: Piece[] = [];
  let blackPieces: Piece[] = [];

  // Collect all pieces
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j].piece;
      if (piece) {
        if (piece.color === 'white') {
          whitePieces.push(piece);
        } else {
          blackPieces.push(piece);
        }
      }
    }
  }

  // King vs King
  if (whitePieces.length === 1 && blackPieces.length === 1) {
    return true;
  }

  // King and Bishop/Knight vs King
  if ((whitePieces.length === 2 && blackPieces.length === 1) ||
      (whitePieces.length === 1 && blackPieces.length === 2)) {
    const morePieces = whitePieces.length > blackPieces.length ? whitePieces : blackPieces;
    return morePieces.some(p => p.type === 'bishop' || p.type === 'knight');
  }

  // King and Bishop vs King and Bishop (same color bishops)
  if (whitePieces.length === 2 && blackPieces.length === 2) {
    const whiteBishop = whitePieces.find(p => p.type === 'bishop');
    const blackBishop = blackPieces.find(p => p.type === 'bishop');
    if (whiteBishop && blackBishop) {
      // Would need to check if bishops are on same colored squares
      return true;
    }
  }

  return false;
};

export const getBoardState = (board: Square[][]): string => {
  // Create a string representation of the board
  return board.map(row => 
    row.map(square => {
      if (!square.piece) return '-';
      return `${square.piece.color[0]}${square.piece.type[0]}`;
    }).join('')
  ).join('|');
};

export const findKingPosition = (color: 'white' | 'black', board: Square[][]): [number, number] => {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j].piece;
      if (piece?.type === 'king' && piece.color === color) {
        return [i, j];
      }
    }
  }
  return [-1, -1]; // Should never happen in a valid game
};

export const hasValidMoves = (
  color: 'white' | 'black', 
  board: Square[][],
  castlingRights: CastlingRights
): boolean => {
  // Check all pieces of the given color
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol].piece;
      if (piece && piece.color === color) {
        // Try all possible destination squares
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            let isValid = false;
            
            switch (piece.type) {
              case 'pawn':
                isValid = isValidPawnMove(fromRow, fromCol, toRow, toCol, piece, board, null);
                break;
              case 'king':
                isValid = isValidKingMove(fromRow, fromCol, toRow, toCol, piece, board, castlingRights);
                break;
              case 'rook':
                isValid = isValidRookMove(fromRow, fromCol, toRow, toCol, piece, board);
                break;
              case 'knight':
                isValid = isValidKnightMove(fromRow, fromCol, toRow, toCol, piece, board);
                break;
              case 'bishop':
                isValid = isValidBishopMove(fromRow, fromCol, toRow, toCol, piece, board);
                break;
              case 'queen':
                isValid = isValidQueenMove(fromRow, fromCol, toRow, toCol, piece, board);
                break;
            }

            if (isValid) {
              // Create a deep copy of the board
              const tempBoard = JSON.parse(JSON.stringify(board));
              
              // Make the move on the temporary board
              tempBoard[toRow][toCol].piece = tempBoard[fromRow][fromCol].piece;
              tempBoard[fromRow][fromCol].piece = null;
              
              // Check if the move would leave the king in check
              const [kingRow, kingCol] = findKingPosition(color, tempBoard);
              if (!isSquareUnderAttack(kingRow, kingCol, color, tempBoard)) {
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}; 