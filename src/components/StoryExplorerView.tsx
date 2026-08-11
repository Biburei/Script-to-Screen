import React, { useState } from 'react';
import { Search, Filter, BookOpen, Tag, Sparkles, ArrowRight, CheckCircle, FileText, Layers } from 'lucide-react';
import { Story } from '../types';

interface StoryExplorerViewProps {
  stories: Story[];
  selectedStory: Story;
  onSelectStory: (story: Story) => void;
  onNavigateTab: (tab: string) => void;
}

export const StoryExplorerView: React.FC<StoryExplorerViewProps> = ({
  stories,
  selectedStory,
  onSelectStory,
  onNavigateTab
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  const genres = ['All', 'Horror', 'Psychological Thriller', 'Dark Fantasy', 'SciFi', 'Eldritch', 'Cosmic', 'Paranormal', 'Urban Legends'];

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          story.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          story.tags.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || story.genre.toLowerCase() === selectedGenre.toLowerCase();
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-red-500" />
            <span>Archival Creepypasta Dataset Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Scraped from local Excel dataset (creepypastas.xlsx) — 3,510 long-form stories indexed.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search titles, tags, or plot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
          />
        </div>
      </div>

      {/* Genre Filter Badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <Filter className="w-4 h-4 text-slate-500 shrink-0" />
        {genres.map(genre => (
          <button
            key={genre}
            onClick={() => setSelectedGenre(genre)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 cursor-pointer ${
              selectedGenre === genre
                ? 'bg-red-950 text-red-300 border border-red-700'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Main Split Grid: Left Story List, Right Active Story Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Story Catalog List */}
        <div className="lg:col-span-5 space-y-3 max-h-[700px] overflow-y-auto pr-1 no-scrollbar">
          {filteredStories.map(story => {
            const isSelected = selectedStory?.id === story.id;
            return (
              <div
                key={story.id}
                onClick={() => onSelectStory(story)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-950/40 border-red-500/80 shadow-md shadow-red-950/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-100 line-clamp-1">{story.title}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-red-400 shrink-0 border border-slate-700">
                    Part {story.part}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                  {story.body}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
                  <span className="text-amber-400/90">{story.genre}</span>
                  <div className="flex items-center gap-3">
                    <span>{story.word_count} words</span>
                    {story.has_pre_rendered_assets && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Assets Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Story Full Detail Card */}
        {selectedStory ? (
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-red-400 uppercase tracking-wider">{selectedStory.genre} • Part {selectedStory.part}</span>
                  <h2 className="text-xl font-display font-bold text-white mt-0.5">{selectedStory.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                    ID: {selectedStory.id}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50 text-xs font-mono">
                    {selectedStory.word_count} Words
                  </span>
                </div>
              </div>

              {/* Tag Category Visual Blueprint */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Extracted SD Art Category Tags & Blueprint:</span>
                </div>
                <p className="text-xs text-slate-300 font-mono leading-relaxed bg-black/40 p-2.5 rounded border border-slate-800">
                  [{selectedStory.tags}]
                </p>
              </div>

              {/* Full Raw Story Text */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Raw Story Body Text:</span>
                </span>
                <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 text-xs text-slate-300 font-sans leading-relaxed max-h-64 overflow-y-auto space-y-3 font-normal">
                  {selectedStory.body}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-mono">
                Ready for LLM 2-Stage Script Rewrite (180-210 words)
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigateTab('script')}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-red-950 hover:from-red-500 hover:to-red-700 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load into Script Writer</span>
                </button>

                <button
                  onClick={() => onNavigateTab('storyboard')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>View Storyboard</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
            <p>Select a story from the left catalog to inspect details.</p>
          </div>
        )}
      </div>
    </div>
  );
};
