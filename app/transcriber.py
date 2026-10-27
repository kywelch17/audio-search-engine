from functools import lru_cache
from . import config

@lru_cache
def get_model():
    from faster_whisper import WhisperModel
    return WhisperModel(config.MODEL_SIZE, device=config.DEVICE, compute_type=config.COMPUTE_TYPE)

def transcribe(path):
    segments, info = get_model().transcribe(path)
    segs = [{"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip()} for s in segments]
    return segs, getattr(info, "language", None), getattr(info, "duration", None)
