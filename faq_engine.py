import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import os
from groq import Groq

class FAQEngine:
    def __init__(self, data_manager):
        self.data_manager = data_manager
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.faqs = []
        self.tfidf_matrix = None
        
        # Groq Setup
        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = "llama-3.1-8b-instant"
        
        # Memory Storage (session_id -> list of messages)
        self.memory = {}
        
        self.refresh()

    def _preprocess(self, text):
        text = text.lower()
        text = re.sub(r'[^\w\s]', '', text)
        return text

    def refresh(self):
        self.faqs = self.data_manager.get_all_faqs()
        if not self.faqs:
            self.tfidf_matrix = None
            return
        questions = [self._preprocess(faq['question']) for faq in self.faqs]
        self.tfidf_matrix = self.vectorizer.fit_transform(questions)

    def _get_history(self, session_id):
        return self.memory.get(session_id, [])[-6:] # Keep last 3 turns

    def _add_to_memory(self, session_id, role, content):
        if session_id not in self.memory:
            self.memory[session_id] = []
        self.memory[session_id].append({"role": role, "content": content})

    def _ai_fallback(self, query, session_id):
        history = self._get_history(session_id)
        messages = [
            {"role": "system", "content": "You are a professional, multilingual AI FAQ Assistant. Maintain context. If the user speaks a non-English language, respond in that language. Keep it structured and concise."},
            *history,
            {"role": "user", "content": query}
        ]
        try:
            chat_completion = self.client.chat.completions.create(messages=messages, model=self.model)
            response = chat_completion.choices[0].message.content
            self._add_to_memory(session_id, "user", query)
            self._add_to_memory(session_id, "assistant", response)
            return response
        except Exception as e:
            return f"Error connecting to AI: {str(e)[:50]}..."

    def get_answer(self, user_query, session_id, threshold=0.3):
        if not self.faqs or self.tfidf_matrix is None:
            return self._ai_fallback(user_query, session_id), "ai", 0.0

        processed_query = self._preprocess(user_query)
        query_vector = self.vectorizer.transform([processed_query])
        similarities = cosine_similarity(query_vector, self.tfidf_matrix).flatten()
        
        best_match_idx = np.argmax(similarities)
        confidence = float(similarities[best_match_idx])

        if confidence >= threshold:
            answer = self.faqs[best_match_idx]['answer']
            self._add_to_memory(session_id, "user", user_query)
            self._add_to_memory(session_id, "assistant", answer)
            return answer, "faq", confidence
        else:
            return self._ai_fallback(user_query, session_id), "ai", confidence
