export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          language: string;
          level: string;
          thumbnail_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          language: string;
          level: string;
          thumbnail_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          language?: string;
          level?: string;
          thumbnail_path?: string;
          created_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string;
          video_path: string;
          duration: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description: string;
          video_path: string;
          duration: number;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string;
          video_path?: string;
          duration?: number;
          order_index?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
