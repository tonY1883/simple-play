#!/usr/bin/env python3
import itertools
import sys
import os
from pathlib import Path
import mutagen
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4
from mutagen.flac import FLAC
from mutagen.id3 import ID3, APIC
from mutagen.mp4 import MP4Cover
from mutagen.oggvorbis import OggVorbis
from mutagen.oggopus import OggOpus
import json
from tqdm import tqdm
import urllib.parse
import hashlib
import base64
import shutil

dir_name = sys.argv[1]

tracks = []
cover_art_data = {}
#Only select formats currently supported by browsers
accept_file_formats = [
	'*.flac', '*.m4a', '*.ogg', '*.webm', '*.mp3', '*.webm', '*.aac', '*.wav'
]

data_dir_path = Path('.simple_play_data')
if data_dir_path.exists():
	shutil.rmtree(data_dir_path)
data_dir_path.mkdir(parents = True, exist_ok = True)
data_dir_path.joinpath('covers').mkdir(exist_ok = True, parents = True)
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
					data["albumIndex"] = int(audio['tracknumber'][0].split('/')[0])
			else:
				pbar.set_description(file.stem)
				data["name"] = file.stem

			# extract album art
			audio_type = file.suffix.lower()
			cover_art = None
			if audio_type == ".mp3":
				audio_data = MP3(file, ID3 = ID3)
				if audio.tags is not None:
					for tag in audio.tags.values():
						if isinstance(tag, APIC):
							cover_art = tag.data
			elif audio_type == ".m4a":
				audio = MP4(file)
				covr = audio.tags.get("covr")
				if covr:
					cover = cover_art = bytes(covr[0])
			elif audio_type == ".flac":
				audio = FLAC(file)
				if hasattr(audio, "pictures") and audio.pictures and len(audio.pictures) > 0:
					cover_art = audio.pictures[0].data
			elif audio_type == ".ogg":
				try:
					audio = OggVorbis(file)
				except:
					audio = OggOpus(file)
				pictures = audio.get("metadata_block_picture")
				if pictures:
					# The picture is base64-encoded
					cover_art = base64.b64decode(pictures[0])
			if cover_art is not None:
				encoded_data = base64.b64encode(cover_art).decode("utf-8")
				if len(encoded_data) > 0:
					key = hashlib.md5(cover_art).hexdigest()
					cover_art_data[key] = encoded_data
					data["cover"] = key
			tracks.append(data)
	except Exception as e:
		print("Fail to read " + str(file))
		print(e)
with open(data_dir_path.joinpath('index.json'), 'w', encoding = 'utf8') as fp:
	json.dump(tracks, fp, ensure_ascii = False)
for md5_hash, b64_data in cover_art_data.items():
	try:
		with open(data_dir_path.joinpath(f"{md5_hash}.txt"), "w") as f:
			f.write(b64_data)
	except Exception as e:
		print(f"Failed to write {md5_hash}: {e}")
with open(data_dir_path.joinpath("index-hash.txt"), "w") as checksum_file:
	checksum_file.write(hashlib.md5(json.dumps(tracks).encode('utf-8')).hexdigest())