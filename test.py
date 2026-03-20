import yfinance as yf
import datetime as dt

end=dt.datetime.now()

if end.month<=6:
    start = end.replace(year=end.year-1, month=12+(end.month-6))
else:
    start = end.replace(month=end.month-6)

data = yf.download("AXON", interval='1wk', end=end, start=start)