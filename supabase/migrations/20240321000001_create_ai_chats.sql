-- Create AI chats table
CREATE TABLE ai_chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    language_style TEXT NOT NULL CHECK (language_style IN ('formal', 'informal')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for storing chat history
CREATE TABLE ai_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID REFERENCES ai_chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for ai_chats
CREATE POLICY "Users can view their own chats"
    ON ai_chats
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats"
    ON ai_chats
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
    ON ai_chats
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
    ON ai_chats
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policies for ai_chat_messages
CREATE POLICY "Users can view messages from their chats"
    ON ai_chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_chats
            WHERE ai_chats.id = ai_chat_messages.chat_id
            AND ai_chats.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to their chats"
    ON ai_chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_chats
            WHERE ai_chats.id = ai_chat_messages.chat_id
            AND ai_chats.user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX idx_ai_chats_user_id ON ai_chats(user_id);
CREATE INDEX idx_ai_chat_messages_chat_id ON ai_chat_messages(chat_id); 