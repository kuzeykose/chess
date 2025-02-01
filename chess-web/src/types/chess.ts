export type Piece = {
  type: 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
  color: 'white' | 'black';
};

export type Square = {
  piece: Piece | null;
  position: string;
};

export type EnPassantState = {
  pawnPosition: string | null;
  capturePosition: string | null;
} | null;

export type DrawReason = 'stalemate' | 'insufficient-material' | 'threefold-repetition' | 'fifty-moves' | null;

export type CastlingRights = {
  whiteKingMoved: boolean;
  whiteKingRookMoved: boolean;
  whiteQueenRookMoved: boolean;
  blackKingMoved: boolean;
  blackKingRookMoved: boolean;
  blackQueenRookMoved: boolean;
};

export type PromotionPiece = 'queen' | 'rook' | 'bishop' | 'knight';
export type PromotionState = {
  pawnPosition: { row: number; col: number };
  color: 'white' | 'black';
} | null; 