#!/usr/bin/env python3
import sys
import os
from pathlib import Path
import mutagen
import json
from tqdm import tqdm

dir_name = sys.argv[1]

tracks = []

#Only select formats currently supported by browsers
files = list(Path(dir_name).rglob('*.flac')) + list(Path(dir_name).rglob('*.m4a')) + list(
	Path(dir_name).rglob('*.ogg')) + list(Path(dir_name).rglob('*.webm')) + list(
	Path(dir_name).rglob('*.mp3')) + list(Path(dir_name).rglob('*.aac')) + list(
	Path(dir_name).rglob('*.wav'))
total_count = len(files)
pbar = tqdm(total = total_count, leave = True)
for idx, file in enumerate(files, start = 1):
	pbar.update(1)
	if file.is_file():
		audio = mutagen.File(str(file))
		pbar.set_description(str(audio['title'][0]))
		data = {}
		data["index"] = idx
		data["name"] = audio['title'][0]
		data["src"] = str(file)
		data["artist"] = audio['artist'][0]
		data["album"] = audio['album'][0]
		tracks.append(data)
with open('index.json', 'w', encoding = 'utf8') as fp:
	json.dump(tracks, fp, ensure_ascii = False)
