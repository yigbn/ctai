export type OpeningSide = 'white' | 'black';

export interface OpeningLine {
  id: string;
  eco: string;
  name: string;
  side: OpeningSide;
  moves: string[]; // SAN moves from the standard initial position
}

// A compact but strong starting opening book. You can extend this list over time.
export const OPENING_BOOK: OpeningLine[] = [
  {
    id: 'ruy-lopez-main',
    eco: 'C60',
    name: 'Ruy Lopez: Main Line',
    side: 'white',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'],
  },
  {
    id: 'italian-game-giuoco-piano',
    eco: 'C50',
    name: 'Italian Game: Giuoco Piano',
    side: 'white',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4', 'cxd4', 'Bb4+', 'Nc3'],
  },
  {
    id: 'sicilian-najdorf',
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf',
    side: 'black',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  },
  {
    id: 'sicilian-dragon',
    eco: 'B70',
    name: 'Sicilian Defense: Dragon',
    side: 'black',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
  },
  {
    id: 'sicilian-scheveningen',
    eco: 'B80',
    name: 'Sicilian Defense: Scheveningen',
    side: 'black',
    moves: ['e4', 'c5', 'Nf3', 'e6', 'd4', 'cxd4', 'Nxd4', 'Nc6', 'Nc3', 'd6'],
  },
  {
    id: 'french-winawer',
    eco: 'C18',
    name: 'French Defense: Winawer',
    side: 'black',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5'],
  },
  {
    id: 'caro-kann-main',
    eco: 'B12',
    name: 'Caro-Kann Defense: Main Line',
    side: 'black',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
  },
  {
    id: 'pirc-classical',
    eco: 'B08',
    name: 'Pirc Defense: Classical',
    side: 'black',
    moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7', 'Be2', 'O-O'],
  },
  {
    id: 'scandinavian-main',
    eco: 'B01',
    name: 'Scandinavian Defense: Main Line',
    side: 'black',
    moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
  },
  {
    id: 'queens-gambit-declined',
    eco: 'D30',
    name: "Queen's Gambit Declined: Orthodox",
    side: 'white',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3', 'O-O'],
  },
  {
    id: 'slav-main',
    eco: 'D10',
    name: 'Slav Defense: Main Line',
    side: 'black',
    moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5'],
  },
  {
    id: 'kings-indian-classical',
    eco: 'E94',
    name: "King's Indian Defense: Classical",
    side: 'black',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5'],
  },
  {
    id: 'nimzo-indian-classical',
    eco: 'E32',
    name: 'Nimzo-Indian Defense: Classical',
    side: 'black',
    moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'Qc2', 'O-O', 'a3', 'Bxc3+', 'Qxc3', 'b6'],
  },
  {
    id: 'grunfeld-exchange',
    eco: 'D85',
    name: 'Grünfeld Defense: Exchange Variation',
    side: 'black',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7'],
  },
  {
    id: 'english-symmetrical',
    eco: 'A30',
    name: 'English Opening: Symmetrical',
    side: 'white',
    moves: ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'Nf3', 'Nf6'],
  },
  {
    id: 'reti-modern',
    eco: 'A09',
    name: 'Reti Opening: Modern',
    side: 'white',
    moves: ['Nf3', 'd5', 'c4', 'e6', 'g3', 'Nf6', 'Bg2', 'Be7', 'O-O', 'O-O'],
  },
];

