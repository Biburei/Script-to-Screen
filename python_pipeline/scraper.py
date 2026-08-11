"""
Module A: Creepypasta Local Excel Dataset Loader (scraper.py)
--------------------------------------------------------------------------------
COMPLETELY ABANDONED & PERMANENTLY REMOVED REDDIT SCRAPING / WEB DATA.
All source material is pulled exclusively from local Excel file datasets (.xlsx)
or CSV files containing long-form archival creepypastas.

Features:
1. Native zero-dependency XLSX parser (zipfile + xml.etree.ElementTree).
2. Automatic Excel text artifact cleaning (removing export tags, quotes, \r\n, formatting glitches).
3. Auto-detection of Part 1 vs Continuation (Part 2+) structure.
4. Seamless fallback dataset auto-generation if local file is missing.
--------------------------------------------------------------------------------
"""

import os
import re
import csv
import json
import time
import zipfile
import logging
import pathlib
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Union, Tuple

from config import EXCEL_DATASET_PATH, CREEPYPASTA_GENRES, DATA_DIR, PIPELINE_STATE_FILE

logger = logging.getLogger("CreepypastaExcelLoader")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def clean_excel_text_artifacts(text: str) -> str:
    """
    Clean weird text artifacts left over from Excel exports and text scraping:
    - Removes Excel export markers like [EXCEL_EXPORT_...], ID tags, etc.
    - Cleans double-quoted strings from CSV/Excel cell wrapping.
    - Strips markdown asterisks (*italic*, **bold**, ***bold-italic***) and standalone/escaped asterisks (*, \*).
    - Normalizes newline characters, tabs, and zero-width unicode artifacts.
    - Cleans up leftover HTML entities (&amp;, &quot;, &#39;, &lt;, &gt;).
    """
    if not text:
        return ""

    text = str(text)

    # Decode HTML entities
    text = text.replace("&amp;", "&").replace("&quot;", '"').replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">")

    # Remove Excel export ID headers / brackets e.g. [EXCEL_EXPORT_ID: 1042], [EXCEL_EXPORT_RAW]
    text = re.sub(r'\[EXCEL_EXPORT_[^\]]*\]', '', text, flags=re.IGNORECASE)

    # Clean double escaped quotes from Excel CSV exports (e.g. ""text"" -> "text")
    text = text.replace('""', '"')

    # Remove Reddit markdown links [label](url) -> label
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    text = re.sub(r'http[s]?://\S+', '', text)

    # Strip out markdown asterisk formatting (*italic*, **bold**, ***bold italic***) while preserving wrapped words
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)

    # Completely remove any remaining standalone, stray, or escaped asterisks (\* or *)
    text = re.sub(r'\\?\*', '', text)

    # Normalize line breaks and whitespace
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Strip leading/trailing quote marks if the entire cell content was wrapped in quotes
    text = text.strip()
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1].strip()

    return text


class PipelineStateManager:
    """
    Manages persistent state across pipeline runs (pipeline_state.json).
    Tracks current row index, story ID, and total dataset record count.
    """
    def __init__(self, state_file: Optional[Union[str, pathlib.Path]] = None):
        self.state_file = pathlib.Path(state_file) if state_file else PIPELINE_STATE_FILE

    def load_state(self) -> Dict[str, Any]:
        """Load state dictionary from pipeline_state.json."""
        if self.state_file.exists():
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Pipeline state load notice: {e}")
        return {"current_index": 0, "current_story_id": None}

    def save_state(self, current_index: int, story_id: str, total_stories: int) -> None:
        """Persist updated state back to pipeline_state.json."""
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            state_data = {
                "current_index": current_index,
                "current_story_id": story_id,
                "total_stories": total_stories,
                "last_updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(state_data, f, indent=2)
            logger.info(f"[StateTracker] Saved pipeline state -> Index {current_index} (Story ID: '{story_id}') in {self.state_file}")
        except Exception as e:
            logger.warning(f"Failed to save pipeline state: {e}")


class CreepypastaExcelLoader:
    """
    Engine that loads, parses, and cleans long-form archival creepypastas
    from local Excel (.xlsx) and CSV datasets.
    """

    def __init__(self, excel_path: Optional[Union[str, pathlib.Path]] = None):
        self.excel_path = pathlib.Path(excel_path or EXCEL_DATASET_PATH)
        self.ensure_dataset_exists()

    def ensure_dataset_exists(self) -> None:
        """Auto-create a default creepypastas.xlsx if none exists."""
        if self.excel_path.exists():
            return

        logger.info(f"Dataset not found at '{self.excel_path}'. Auto-generating default local Excel dataset...")
        self.excel_path.parent.mkdir(parents=True, exist_ok=True)
        self._generate_default_excel(self.excel_path)

    def _generate_default_excel(self, file_path: pathlib.Path) -> None:
        """Generates a default local Excel file with sample long-form creepypastas."""
        headers = ['id', 'title', 'body', 'part', 'genre']
        rows = [
            [
                'cp_001_pt1',
                'The Third Eye in the Frozen Watchtower - Part 1',
                '""[EXCEL_EXPORT_ID: 1042] I work night shifts at an isolated weather watchtower in northern Norway. Three nights ago, during a severe blizzard, the thermal sensors logged a human body temperature moving across the zero-visibility tundra at 40 miles per hour. Yesterday, I heard a quiet, rhythmic tapping on the reinforced glass window—twenty feet above the frozen ice. When I swung the heavy spotlight around, something wearing a torn yellow raincoat was clinging to the sheer frosted glass, smiling with far too many teeth. It hasn\'t moved since. It\'s just watching me type this.""',
                '1',
                'Horror'
            ],
            [
                'cp_001_pt2',
                'The Third Eye in the Frozen Watchtower - Part 2',
                '\"\"[EXCEL_EXPORT_ID: 1043] As the generator flickered out, the temperature inside the watchtower plummeted rapidly. The creature on the glass began to scratch softly against the frame, leaving deep gouges in the bulletproof acrylic. I grabbed my flare gun and backed into the emergency stairwell, hearing the heavy glass finally shatter behind me.\"\"',
                '2',
                'Horror'
            ],
            [
                'cp_002_pt1',
                'The Whispering Walls of Blackwood Manor - Part 1',
                '\"\"[EXCEL_EXPORT_RAW] When we renovated the basement of our 1890s Victorian house, we found a sealed wooden door behind the drywall. Inside sat an ornate oil portrait wrapped in burlap. It depicted a man standing in our current bedroom, looking terrified while a shadowed, horned silhouette loomed directly behind him. The strange part isn\'t the painting itself—it\'s that the canvas was dated yesterday, and the man in the portrait was wearing the exact same sweater I bought two hours ago.\"\"',
                '1',
                'Creepypasta'
            ],
            [
                'cp_002_pt2',
                'The Whispering Walls of Blackwood Manor - Part 2',
                '\"\"[EXCEL_EXPORT_RAW] Meanwhile, the floorboards above me started creaking under heavy, deliberate footsteps. I listened in pure terror as the footsteps stopped right over the basement stairs. Then came the sound of a key slowly turning in the lock of the door I had just unsealed.\"\"',
                '2',
                'Creepypasta'
            ],
            [
                'cp_003_pt1',
                'Do Not Answer the Midnight Knock - Part 1',
                '\"\"There is one rule in this coastal fog town: if you hear three sharp knocks on your front door at exactly 3:15 AM, you do not open it, no matter whose voice calls out. Last night, my late grandmother\'s voice wept outside, begging me to let her in from the freezing rain. I held my breath and peeked through the peephole. Standing in the porch light was a tall, bone-white creature wearing a hollow wooden mask, holding an old radio playing my grandmother\'s voice on loop.\"\"',
                '1',
                'Horror'
            ]
        ]

        shared_strings = []
        string_map = {}

        def get_string_idx(s):
            s = str(s)
            if s not in string_map:
                string_map[s] = len(shared_strings)
                shared_strings.append(s)
            return string_map[s]

        all_data = [headers] + rows
        sheet_rows_xml = []
        for r_idx, row in enumerate(all_data, 1):
            cell_xmls = []
            for c_idx, val in enumerate(row):
                s_idx = get_string_idx(val)
                col_letter = chr(65 + c_idx)
                cell_xmls.append(f'<c r="{col_letter}{r_idx}" t="s"><v>{s_idx}</v></c>')
            sheet_rows_xml.append(f'<row r="{r_idx}">{" ".join(cell_xmls)}</row>')

        sheet_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
{" ".join(sheet_rows_xml)}
</sheetData>
</worksheet>'''

        ss_xml_items = [f'<si><t>{s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")}</t></si>' for s in shared_strings]
        shared_strings_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{len(shared_strings)}" uniqueCount="{len(shared_strings)}">
{" ".join(ss_xml_items)}
</sst>'''

        content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedString+xml"/>
</Types>'''

        rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''

        wb_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>'''

        workbook = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
</sheets>
</workbook>'''

        with zipfile.ZipFile(file_path, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('[Content_Types].xml', content_types)
            z.writestr('_rels/.rels', rels)
            z.writestr('xl/workbook.xml', workbook)
            z.writestr('xl/_rels/workbook.xml.rels', wb_rels)
            z.writestr('xl/worksheets/sheet1.xml', sheet_xml)
            z.writestr('xl/sharedStrings.xml', shared_strings_xml)

        logger.info(f"Successfully generated dataset file at '{file_path}'.")

    def _read_xlsx_rows(self, file_path: pathlib.Path) -> List[List[str]]:
        """Native XLSX row reader using standard library zipfile + XML element tree."""
        with zipfile.ZipFile(file_path, 'r') as z:
            shared_strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                    texts = [t.text or '' for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]
                    shared_strings.append(''.join(texts))

            sheet_xml = z.read('xl/worksheets/sheet1.xml')
            tree = ET.fromstring(sheet_xml)
            rows = []
            for row in tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                row_vals = []
                for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    t_attr = c.attrib.get('t')
                    v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = ''
                    if v_elem is not None and v_elem.text is not None:
                        if t_attr == 's':
                            idx = int(v_elem.text)
                            val = shared_strings[idx] if idx < len(shared_strings) else ''
                        else:
                            val = v_elem.text
                    else:
                        is_elem = c.find('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')
                        if is_elem is not None and is_elem.text:
                            val = is_elem.text
                    row_vals.append(val)
                if row_vals:
                    rows.append(row_vals)
            return rows

    def load_dataset(self, file_path: Optional[pathlib.Path] = None) -> List[Dict[str, Any]]:
        """Reads dataset from .xlsx or .csv into standardized dictionary records."""
        target_path = pathlib.Path(file_path or self.excel_path)
        if not target_path.exists():
            self.ensure_dataset_exists()
            target_path = self.excel_path

        records = []
        if target_path.suffix.lower() == '.csv':
            with open(target_path, 'r', encoding='utf-8', errors='ignore') as f:
                reader = csv.reader(f)
                rows = list(reader)
        else:
            rows = self._read_xlsx_rows(target_path)

        if not rows:
            return []

        header = [str(col).strip().lower() for col in rows[0]]
        
        # Determine column indexes
        id_idx = next((i for i, h in enumerate(header) if 'id' in h), 0)
        title_idx = next((i for i, h in enumerate(header) if 'title' in h or 'name' in h or 'heading' in h), 1 if len(header) > 1 else 0)
        body_idx = next((i for i, h in enumerate(header) if 'body' in h or 'story' in h or 'text' in h or 'content' in h or 'chunk' in h), 2 if len(header) > 2 else 0)
        part_idx = next((i for i, h in enumerate(header) if 'part' in h or 'continuation' in h or 'seq' in h), -1)
        genre_idx = next((i for i, h in enumerate(header) if 'genre' in h or 'cat' in h or 'type' in h), -1)

        for row_num, row in enumerate(rows[1:], 2):
            if not row:
                continue

            row_id = str(row[id_idx]).strip() if id_idx < len(row) and row[id_idx] else f"row_{row_num}"
            raw_title = str(row[title_idx]) if title_idx < len(row) else f"Archival Story #{row_num}"
            raw_body = str(row[body_idx]) if body_idx < len(row) else ""

            part_val = 1
            if part_idx != -1 and part_idx < len(row) and row[part_idx]:
                part_str = str(row[part_idx]).strip()
                digits = re.findall(r'\d+', part_str)
                if digits:
                    part_val = int(digits[0])

            # Also check if title or body contains "Part 2", "Part 3", etc.
            title_part_match = re.search(r'(?i)part\s*(\d+)', raw_title)
            if title_part_match:
                part_val = int(title_part_match.group(1))

            genre_val = str(row[genre_idx]).strip() if genre_idx != -1 and genre_idx < len(row) and row[genre_idx] else "Horror"

            clean_title = clean_excel_text_artifacts(raw_title)
            clean_body = clean_excel_text_artifacts(raw_body)

            if not clean_body:
                continue

            word_count = len(re.findall(r'\b\w+\b', clean_body))

            records.append({
                "id": row_id,
                "title": clean_title,
                "body": clean_body,
                "part": part_val,
                "is_continuation": (part_val >= 2),
                "genre": genre_val,
                "subreddit": "archival_creepypastas",
                "word_count": word_count,
                "source_type": "LOCAL_EXCEL_DATASET"
            })

        return records

    def fetch_creepypasta_story(
        self,
        story_id: Optional[str] = None,
        part: Optional[int] = None,
        genre: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fetch a specific story or filtered story from local Excel dataset."""
        dataset = self.load_dataset()
        if not dataset:
            raise ValueError("Local Excel dataset is empty.")

        filtered = dataset

        if story_id:
            match = [s for s in filtered if str(s['id']).lower() == str(story_id).lower()]
            if match:
                return match[0]

        if part is not None:
            part_matches = [s for s in filtered if s['part'] == part]
            if part_matches:
                filtered = part_matches

        if genre:
            genre_matches = [s for s in filtered if genre.lower() in s['genre'].lower()]
            if genre_matches:
                filtered = genre_matches

        return filtered[0] if filtered else dataset[0]

    def fetch_sequential_story(self) -> Tuple[Dict[str, Any], int]:
        """
        Fetches the story corresponding to the currently tracked index in pipeline_state.json.
        Returns a tuple of (story_dict, current_index).
        """
        dataset = self.load_dataset()
        if not dataset:
            raise ValueError("Local Excel dataset is empty.")

        state_mgr = PipelineStateManager()
        state = state_mgr.load_state()

        current_idx = state.get("current_index", 0)
        saved_story_id = state.get("current_story_id")

        total = len(dataset)
        current_idx = current_idx % total

        if saved_story_id and dataset[current_idx]["id"] != saved_story_id:
            found_idx = next((i for i, s in enumerate(dataset) if str(s["id"]).lower() == str(saved_story_id).lower()), None)
            if found_idx is not None:
                current_idx = found_idx

        story = dataset[current_idx]
        logger.info(f"[StateTracker] Loaded sequential story at Index {current_idx}/{total - 1} (ID: '{story['id']}')")
        return story, current_idx

    def advance_sequential_state(self, current_index: int) -> Dict[str, Any]:
        """
        Advances the sequence pointer to the next story index (wrapping around to 0 if at dataset end)
        and persists the updated state to pipeline_state.json.
        """
        dataset = self.load_dataset()
        if not dataset:
            return {}

        total = len(dataset)
        next_idx = (current_index + 1) % total
        next_story = dataset[next_idx]

        state_mgr = PipelineStateManager()
        state_mgr.save_state(current_index=next_idx, story_id=next_story["id"], total_stories=total)
        logger.info(f"[StateTracker] Advanced state sequence pointer: Next run will process Index {next_idx} (ID: '{next_story['id']}')")
        return next_story

    # Backward-compatibility alias methods for seamless drop-in
    def fetch_top_posts(
        self,
        subreddit: Optional[Union[str, List[str]]] = None,
        genre: Optional[str] = None,
        time_filter: str = "day",
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        """Backward compatibility wrapper mapping to local Excel dataset."""
        logger.info("[ExcelDataset] Reading creepypasta stories from local Excel file...")
        dataset = self.load_dataset()
        if genre:
            matches = [s for s in dataset if genre.lower() in s['genre'].lower()]
            if matches:
                return matches
        return dataset

    def get_post_by_id(self, subreddit: str, post_id: str) -> Optional[Dict[str, Any]]:
        """Backward compatibility wrapper mapping to local Excel dataset."""
        dataset = self.load_dataset()
        for s in dataset:
            if str(s['id']).lower() == str(post_id).lower():
                return s
        return dataset[0] if dataset else None


# Backward-compatibility module aliases
RedditScraper = CreepypastaExcelLoader


def fetch_reddit_story(subreddit: str = "nosleep", time_filter: str = "day") -> Dict[str, Any]:
    """Helper function mapping to local Excel dataset loader."""
    loader = CreepypastaExcelLoader()
    return loader.fetch_creepypasta_story()


if __name__ == "__main__":
    loader = CreepypastaExcelLoader()
    stories = loader.load_dataset()
    print(f"Successfully loaded {len(stories)} creepypasta stories from Excel dataset:")
    for idx, s in enumerate(stories, 1):
        print(f"\n--- Story #{idx} [ID: {s['id']}] (Part {s['part']}, Genre: {s['genre']}) ---")
        print(f"Title: {s['title']}")
        print(f"Word Count: {s['word_count']} words")
        print(f"Snippet: {s['body'][:120]}...")
