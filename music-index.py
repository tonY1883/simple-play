#!/usr/bin/env python3
import itertools
import sys
import os
from pathlib import Path
import mutagen
import json
from tqdm import tqdm
import urllib.parse

dir_name = sys.argv[1]

tracks = []

#Only select formats currently supported by browsers
accept_file_formats = [
	'*.flac', '*.m4a', '*.ogg', '*.webm', '*.mp3', '*.webm', '*.mp3', '*.aac', '*.wav'
]
files = list(itertools.chain.from_iterable(map((lambda x: list(Path(dir_name).rglob(x))), accept_file_formats)))
total_count = len(files)
pbar = tqdm(total = total_count, leave = True)
for idx, file in enumerate(files, start = 1):
	try:
		pbar.update(1)
		if file.is_file():
			audio = mutagen.File(str(file), easy = True)
			data = {}
			data["index"] = idx
			data["src"] = urllib.parse.quote(str(file))
			if 'title' in audio:
				pbar.set_description(str(audio['title'][0]))
				data["name"] = audio['title'][0]
				if 'artist' in audio:
					data["artist"] = audio['artist'][0]
				if 'album' in audio:
					data["album"] = audio['album'][0]
				if 'tracknumber' in audio:
					data["albumIndex"] = int(audio['tracknumber'][0])
			else:
				pbar.set_description(file.stem)
				data["name"] = file.stem
			tracks.append(data)
	except:
		print("Fail to read " + str(file))
with open('index.json', 'w', encoding = 'utf8') as fp:
	json.dump(tracks, fp, ensure_ascii = False)
