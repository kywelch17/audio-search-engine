import re, sqlite3, threading
_lock = threading.Lock()

class DB:
    def __init__(self, path):
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript("""
        CREATE TABLE IF NOT EXISTS files(id INTEGER PRIMARY KEY, filename TEXT, path TEXT,
          status TEXT DEFAULT 'pending', error TEXT, language TEXT, duration REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS segments(id INTEGER PRIMARY KEY, file_id INTEGER, idx INTEGER,
          start REAL, end REAL, text TEXT);
        CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(text, content='segments', content_rowid='id');
        CREATE TRIGGER IF NOT EXISTS seg_ai AFTER INSERT ON segments BEGIN
          INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text); END;
        """)

    def q(self, sql, args=()):
        with _lock:
            cur = self.conn.execute(sql, args); self.conn.commit()
            return cur

    def add_file(self, filename, path):
        return self.q("INSERT INTO files(filename,path) VALUES(?,?)", (filename, path)).lastrowid

    def set_status(self, fid, status, error=None, language=None, duration=None):
        self.q("UPDATE files SET status=?,error=?,language=COALESCE(?,language),duration=COALESCE(?,duration) WHERE id=?",
               (status, error, language, duration, fid))

    def add_segments(self, fid, segs):
        rows = [(fid, i, s["start"], s["end"], s["text"]) for i, s in enumerate(segs)]
        with _lock, self.conn:
            self.conn.executemany("INSERT INTO segments(file_id,idx,start,end,text) VALUES(?,?,?,?,?)", rows)

    def get_file(self, fid):
        r = self.q("SELECT * FROM files WHERE id=?", (fid,)).fetchone()
        return dict(r) if r else None

    def list_files(self):
        return [dict(r) for r in self.q("SELECT id,filename,status,language,duration,created_at FROM files ORDER BY id")]

    def segments(self, fid):
        return [dict(r) for r in self.q("SELECT idx,start,end,text FROM segments WHERE file_id=? ORDER BY idx", (fid,))]

    def search(self, query, limit=20):
        terms = re.findall(r"\w+", query)
        if not terms:
            return []
        fts = " ".join('"' + t + '"' for t in terms)
        sql = """SELECT f.id file_id, f.filename, s.start, s.end, s.text,
                 snippet(segments_fts, 0, '[', ']', '...', 12) snippet
                 FROM segments_fts JOIN segments s ON s.id=segments_fts.rowid
                 JOIN files f ON f.id=s.file_id WHERE segments_fts MATCH ? ORDER BY rank LIMIT ?"""
        return [dict(r) for r in self.q(sql, (fts, limit))]
