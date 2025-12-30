# AI-Powered FAQ Chatbot

A complete, production-ready FAQ chatbot built with Python, Flask, and NLP (TF-IDF + Cosine Similarity).

## Features
- **AI Chat Interface**: Uses NLP to understand and answer user questions.
- **Admin Dashboard**: Full CRUD (Create, Read, Update, Delete) functionality for FAQs.
- **JSON Storage**: Lightweight and portable data management.
- **NLP Matching**: Scikit-learn based TF-IDF vectorization for accurate matching.

## Project Structure
- `app.py`: Flask entry point and API routes.
- `faq_engine.py`: Core NLP logic.
- `data_manager.py`: JSON data handling.
- `data/`: Contains the FAQ database.
- `templates/`: HTML interfaces for chat and admin.
- `static/`: CSS and JS assets.

## Setup Instructions

1. **Clone the repository** (or navigate to the project folder).
2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Configuration**:
   - Copy `.env.example` to `.env`.
   - Set your `SECRET_KEY`.
5. **Run the application**:
   ```bash
   python app.py
   ```
6. **Access the application**:
   - Chat Interface: `http://127.0.0.1:5000`
   - Admin Dashboard: `http://127.0.0.1:5000/admin`

## Technologies Used
- **Backend**: Flask
- **NLP**: Scikit-learn (TF-IDF, Cosine Similarity)
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Data**: JSON
