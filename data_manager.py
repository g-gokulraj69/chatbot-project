import json
import os
import uuid
import csv
from datetime import datetime

class FAQDataManager:
    def __init__(self, data_dir='data'):
        self.data_dir = data_dir
        self.files = {
            'faqs': os.path.join(data_dir, 'faqs.json'),
            'logs': os.path.join(data_dir, 'logs.json'),
            'feedback': os.path.join(data_dir, 'feedback.json'),
            'users': os.path.join(data_dir, 'users.json')
        }
        self._ensure_files_exist()

    def _ensure_files_exist(self):
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
        for path in self.files.values():
            if not os.path.exists(path):
                with open(path, 'w') as f:
                    json.dump([], f)

    # --- FAQ Management ---
    def get_all_faqs(self):
        with open(self.files['faqs'], 'r') as f:
            return json.load(f)

    def save_faqs(self, faqs):
        with open(self.files['faqs'], 'w') as f:
            json.dump(faqs, f, indent=4)

    def add_faq(self, question, answer):
        faqs = self.get_all_faqs()
        new_faq = {"id": str(uuid.uuid4()), "question": question, "answer": answer}
        faqs.append(new_faq)
        self.save_faqs(faqs)
        return new_faq

    def update_faq(self, faq_id, question, answer):
        faqs = self.get_all_faqs()
        for faq in faqs:
            if faq['id'] == faq_id:
                faq['question'], faq['answer'] = question, answer
                self.save_faqs(faqs)
                return True
        return False

    def delete_faq(self, faq_id):
        faqs = self.get_all_faqs()
        new_faqs = [f for f in faqs if f['id'] != faq_id]
        if len(new_faqs) < len(faqs):
            self.save_faqs(new_faqs)
            return True
        return False

    # --- CSV Import/Export ---
    def export_faqs_csv(self, output_path):
        faqs = self.get_all_faqs()
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['question', 'answer'])
            for faq in faqs:
                writer.writerow([faq['question'], faq['answer']])

    def import_faqs_csv(self, input_path):
        with open(input_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('question') and row.get('answer'):
                    self.add_faq(row['question'], row['answer'])

    # --- Logging & Analytics ---
    def log_chat(self, query, answer, source, confidence, session_id):
        logs = self.get_logs()
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "answer": answer,
            "source": source, # 'faq' or 'ai'
            "confidence": confidence,
            "session_id": session_id
        }
        logs.append(log_entry)
        with open(self.files['logs'], 'w') as f:
            json.dump(logs, f, indent=4)

    def get_logs(self):
        with open(self.files['logs'], 'r') as f:
            return json.load(f)

    def add_feedback(self, query, is_positive):
        feedbacks = self.get_feedbacks()
        feedbacks.append({
            "timestamp": datetime.now().isoformat(),
            "query": query,
            "is_positive": is_positive
        })
        with open(self.files['feedback'], 'w') as f:
            json.dump(feedbacks, f, indent=4)

    def get_feedbacks(self):
        with open(self.files['feedback'], 'r') as f:
            return json.load(f)

    # --- Role Based User Management ---
    def get_users(self):
        with open(self.files['users'], 'r') as f:
            return json.load(f)

    def add_user(self, username, password, role):
        users = self.get_users()
        users.append({"username": username, "password": password, "role": role})
        with open(self.files['users'], 'w') as f:
            json.dump(users, f, indent=4)
