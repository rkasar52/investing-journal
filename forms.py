from flask_wtf import FlaskForm
from wtforms import StringField, TextAreaField, FloatField, DateField, IntegerField, SelectField
from wtforms.validators import DataRequired, Optional

ACTIONS = [('HOLD','HOLD'), ('ADD','ADD'), ('TRIM','TRIM'), ('EXIT','EXIT')]

class PositionForm(FlaskForm):
    ticker = StringField('Ticker', validators=[DataRequired()])
    buy_date = DateField('Buy Date', validators=[Optional()])
    buy_price = FloatField('Buy Price', validators=[Optional()])
    shares = FloatField('Shares', validators=[Optional()])
    initial_thesis = TextAreaField('Initial Thesis', validators=[Optional()])
    target_price = FloatField('Target Price', validators=[Optional()])
    target_date = DateField('Target Date', validators=[Optional()])
    goal_note = TextAreaField('Goal Notes', validators=[Optional()])

class ThesisUpdateForm(FlaskForm):
    update_date = DateField('Update Date', validators=[Optional()])
    quarter_label = StringField('Quarter Label (YYYY-QN)', validators=[Optional()])
    update_text = TextAreaField('What changed?', validators=[DataRequired()])
    rating = IntegerField('Confidence (1-5)', validators=[Optional()])
    action = SelectField('Action', choices=ACTIONS, validators=[Optional()])