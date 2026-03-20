# services/agent.py
import os
from openai import OpenAI

from dotenv import load_dotenv
import os

load_dotenv() 
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_advice_from_notes(ticker, notes, goals):
    notes_text = "\n".join(notes) if notes else "No notes provided."
    goals_text = "\n".join(goals) if goals else "No goals provided."

    prompt = f"""
You are an investing assistant helping me review my position in {ticker}.
Here is my thesis and goals:

Thesis:
{notes_text}

Goals:
{goals_text}

Please:
1. Summarize what I said about this stock.
2. Suggest one clear action or next step I should consider this quarter (hold, trim, add, sell).
3. Keep it concise (3-4 sentences).
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
        )
        print(response.choices[0].message.content)
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating advice: {e}"

if __name__ == '__main__':
    advice = generate_advice_from_notes(ticker = 'AAPL', notes = 'Long term hold', goals = 'Retirement in 2060')
    print(advice)