from flask import Flask, request, jsonify, render_template, session, redirect, url_for, flash, send_file
from data_manager import FAQDataManager
from faq_engine import FAQEngine
import os
import uuid
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-key-789')

db = FAQDataManager()
engine = FAQEngine(db)

# --- RBAC Helper ---
def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('logged_in'):
                return redirect(url_for('login'))
            if session.get('role') not in roles:
                flash("Unauthorized access for your role.")
                return redirect(url_for('admin'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# --- AUTH ROUTES ---

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        u, p = request.form.get('username'), request.form.get('password')
        
        # Default Super Admin from .env
        if u == os.getenv('ADMIN_USERNAME') and p == os.getenv('ADMIN_PASSWORD'):
            session.update({'logged_in': True, 'user': u, 'role': 'super_admin'})
            return redirect(url_for('admin'))
            
        # Check other users in DB
        users = db.get_users()
        for user in users:
            if user['username'] == u and user['password'] == p:
                session.update({'logged_in': True, 'user': u, 'role': user['role']})
                return redirect(url_for('admin'))
        
        flash("Invalid credentials")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- WEB & ADMIN ROUTES ---

@app.route('/')
def index():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())
    return render_template('index.html')

@app.route('/admin')
@role_required(['super_admin', 'editor', 'viewer'])
def admin():
    return render_template('admin.html')

# --- CHAT & FEEDBACK API ---

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    query = data.get('message', '')
    session_id = session.get('session_id', 'default')
    
    answer, source, confidence = engine.get_answer(query, session_id)
    db.log_chat(query, answer, source, confidence, session_id)
    
    return jsonify({"answer": answer, "source": source, "confidence": round(confidence, 2)})

@app.route('/api/feedback', methods=['POST'])
def feedback():
    data = request.json
    db.add_feedback(data.get('query'), data.get('is_positive'))
    return jsonify({"status": "ok"})

# --- ADMIN API (RBAC PROTECTED) ---

@app.route('/api/faqs', methods=['GET'])
@role_required(['super_admin', 'editor', 'viewer'])
def get_faqs():
    return jsonify(db.get_all_faqs())

@app.route('/api/faqs', methods=['POST'])
@role_required(['super_admin', 'editor'])
def add_faq():
    data = request.json
    res = db.add_faq(data['question'], data['answer'])
    engine.refresh()
    return jsonify(res), 201

@app.route('/api/faqs/<id>', methods=['PUT'])
@role_required(['super_admin', 'editor'])
def update_faq(id):
    data = request.json
    if db.update_faq(id, data['question'], data['answer']):
        engine.refresh()
        return jsonify({"status": "updated"})
    return jsonify({"error": "FAQ not found"}), 404

@app.route('/api/faqs/<id>', methods=['DELETE'])
@role_required(['super_admin'])
def delete_faq(id):
    db.delete_faq(id)
    engine.refresh()
    return jsonify({"status": "deleted"})

# --- ANALYTICS API ---

@app.route('/api/analytics')
@role_required(['super_admin', 'viewer'])
def get_analytics():
    logs = db.get_logs()
    total = len(logs)
    faq_count = sum(1 for l in logs if l['source'] == 'faq')
    ai_count = total - faq_count
    
    # Most asked (top 5)
    queries = [l['query'] for l in logs]
    most_asked = {}
    for q in queries: most_asked[q] = most_asked.get(q, 0) + 1
    sorted_queries = sorted(most_asked.items(), key=lambda x: x[1], reverse=True)[:5]

    return jsonify({
        "total_chats": total,
        "faq_usage": faq_count,
        "ai_fallback_usage": ai_count,
        "most_asked": sorted_queries,
        "avg_confidence": round(sum(l['confidence'] for l in logs)/total if total > 0 else 0, 2)
    })

# --- CSV IMPORT/EXPORT ---

@app.route('/api/export')
@role_required(['super_admin'])
def export_csv():
    path = 'data/export_faqs.csv'
    db.export_faqs_csv(path)
    return send_file(path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000, use_reloader=False)
