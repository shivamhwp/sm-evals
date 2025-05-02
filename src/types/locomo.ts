export interface DialogTurn {
  speaker: string;
  dia_id: string;
  text: string;
  img_url?: string;
  blip_caption?: string;
  search_query?: string;
}

export interface Session {
  [key: string]: DialogTurn[];
}

export interface ConversationData {
  sample_id: string;
  conversation: {
    speaker_a: string;
    speaker_b: string;
    [key: string]: string | Session;
  };
  observation: {
    [key: string]: string;
  };
  session_summary: {
    [key: string]: string;
  };
  event_summary: {
    [key: string]: any[];
  };
  qa: {
    question: string;
    answer: string;
    category: string;
    evidence?: string[];
  }[];
}
