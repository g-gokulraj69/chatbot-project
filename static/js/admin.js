document.addEventListener('DOMContentLoaded', () => {
    const faqList = document.getElementById('faq-list');
    const analytics = {
        total: document.getElementById('stat-total'),
        faq: document.getElementById('stat-faq'),
        ai: document.getElementById('stat-ai'),
        conf: document.getElementById('stat-conf')
    };

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics');
            const data = await res.json();
            analytics.total.textContent = data.total_chats.toLocaleString();
            analytics.faq.textContent = data.faq_usage.toLocaleString();
            analytics.ai.textContent = data.ai_fallback_usage.toLocaleString();
            analytics.conf.textContent = (data.avg_confidence * 100).toFixed(0) + '%';
            
            // Populate most asked
            const mostAskedList = document.getElementById('most-asked');
            if (mostAskedList) {
                mostAskedList.innerHTML = data.most_asked.map(q => `
                    <li style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-main); border-radius: 0.5rem;">
                        <span style="font-size: 0.875rem; font-weight: 500; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;" title="${q[0]}">${q[0]}</span>
                        <span style="font-size: 0.75rem; font-weight: 600; color: var(--primary); background: white; padding: 0.25rem 0.5rem; border-radius: 0.375rem; border: 1px solid var(--border);">${q[1]} hits</span>
                    </li>
                `).join('');
            }
        } catch (err) {
            console.error("Failed to fetch analytics", err);
        }
    };

    const fetchFAQs = async () => {
        try {
            const res = await fetch('/api/faqs');
            const faqs = await res.json();
            renderFAQs(faqs);
        } catch (err) {
            console.error("Failed to fetch FAQs", err);
        }
    };

    const renderFAQs = (faqs) => {
        faqList.innerHTML = faqs.map(faq => `
            <tr>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${faq.question}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted);">${faq.answer}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button onclick="editFAQ('${faq.id}', '${encodeURIComponent(faq.question)}', '${encodeURIComponent(faq.answer)}')" class="btn btn-secondary" style="padding: 0.4rem;" title="Edit">
                            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button onclick="deleteFAQ('${faq.id}')" class="btn btn-secondary" style="padding: 0.4rem; color: var(--danger);" title="Delete">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        if (window.lucide) lucide.createIcons();
    };

    window.saveFAQ = async () => {
        const id = document.getElementById('faq-id').value;
        const question = document.getElementById('faq-question').value.trim();
        const answer = document.getElementById('faq-answer').value.trim();
        
        if (!question || !answer) {
            alert("Please fill in both question and answer.");
            return;
        }

        const payload = { question, answer };
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/faqs/${id}` : '/api/faqs';
        
        try {
            const btn = document.getElementById('save-btn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="spin" style="width: 1rem; height: 1rem;"></i> Saving...';
            lucide.createIcons();

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            location.reload();
        } catch (err) {
            alert("Failed to save FAQ.");
            console.error(err);
        }
    };

    window.deleteFAQ = async (id) => {
        if (confirm('Are you sure you want to delete this FAQ entry?')) {
            try {
                await fetch(`/api/faqs/${id}`, { method: 'DELETE' });
                fetchFAQs();
                fetchAnalytics();
            } catch (err) {
                alert("Failed to delete FAQ.");
            }
        }
    };

    window.editFAQ = (id, q, a) => {
        document.getElementById('faq-id').value = id;
        document.getElementById('faq-question').value = decodeURIComponent(q);
        document.getElementById('faq-answer').value = decodeURIComponent(a);
        document.getElementById('faq-question').focus();
        // Change button text to reflect update
        document.getElementById('save-btn').innerHTML = '<i data-lucide="refresh-cw" style="width: 1rem; height: 1rem;"></i> Update Entry';
        lucide.createIcons();
    };

    document.getElementById('save-btn').onclick = saveFAQ;
    
    fetchAnalytics();
    fetchFAQs();
});
