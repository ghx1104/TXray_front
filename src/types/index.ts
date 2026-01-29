export interface ProgressEvent {
  type: 
    | 'rpc_done' 
    | 'etherscan_start' 
    | 'etherscan_done' 
    | 'tenderly_start' 
    | 'tenderly_done' 
    | 'draft_start' 
    | 'draft_chunk' 
    | 'draft_done' 
    | 'done' 
    | 'error';
  payload?: any;
  content?: string;
  message?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  report?: any;
  status?: 'loading' | 'completed' | 'error';
  progress?: ProgressEvent[];
}
