ALTER TABLE recent_sessions ENABLE ROW LEVEL SECURITY; CREATE POLICY \
Users
can
manage
their
own
sessions\ ON recent_sessions FOR ALL USING (auth.uid() = user_id);
