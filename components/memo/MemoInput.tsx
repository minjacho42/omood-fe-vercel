'use client'

import React, { useState, useRef } from 'react';
import { Plus, Mic, Camera, X, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createMemo } from '@/lib/api';
import { CategoryConfig } from '@/types';

interface MemoInputProps {
  onMemoCreated: () => void;
  categories: Record<string, CategoryConfig>;
}

export const MemoInput: React.FC<MemoInputProps> = ({ onMemoCreated, categories }) => {
  const [showInput, setShowInput] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputTags, setInputTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [inputAttachments, setInputAttachments] = useState<{
    images: File[];
    audios: Blob[];
  }>({ images: [], audios: [] });
  const [isRecording, setIsRecording] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    if (currentTag.trim() && !inputTags.includes(currentTag.trim())) {
      setInputTags([...inputTags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (index: number) => {
    setInputTags(inputTags.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    // ... (implementation from page.tsx)
  };

  const stopRecording = () => {
    // ... (implementation from page.tsx)
  };

  const addImages = (files: FileList | null) => {
    // ... (implementation from page.tsx)
  };

  const removeInputImage = (index: number) => {
    setInputAttachments((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    const formData = new FormData();
    formData.append("content", inputText);
    formData.append("tags", inputTags.join(","));
    if (selectedCategory) {
      formData.append("category", selectedCategory);
    }
    inputAttachments.images.forEach((file, index) => {
      formData.append(`image_${index}`, file, file.name);
    });
    // ... handle audio attachments

    await createMemo(formData);
    resetInputState();
    onMemoCreated();
  };

  const resetInputState = () => {
    setShowInput(false);
    setInputText("");
    setInputTags([]);
    setCurrentTag("");
    setInputAttachments({ images: [], audios: [] });
    setSelectedCategory(null);
  };

  if (!showInput) {
    return (
      <div className="text-center my-6">
        <Button onClick={() => setShowInput(true)} className="rounded-full py-6 px-8 bg-white/20 hover:bg-white/30 text-white">
          <Plus className="w-6 h-6 mr-2" />
          Add a Memo
        </Button>
      </div>
    );
  }

  return (
    <div className="my-6 p-6 bg-white/10 rounded-2xl">
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full bg-transparent text-white placeholder-white/60 text-lg resize-none focus:outline-none"
        rows={4}
      />
      {/* Image Previews */}
      <div className="flex flex-wrap gap-2 mt-2">
        {inputAttachments.images.map((file, index) => (
          <div key={index} className="relative">
            <img src={URL.createObjectURL(file)} alt="preview" className="w-20 h-20 object-cover rounded-lg" />
            <button onClick={() => removeInputImage(index)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Tag Input */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          {inputTags.map((tag, index) => (
            <div key={index} className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm">
              <span>{tag}</span>
              <button onClick={() => removeTag(index)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <input
            type="text"
            value={currentTag}
            onChange={(e) => setCurrentTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tags..."
            className="bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Category Selector */}
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(categories).map(([key, { name, icon, color }]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
              selectedCategory === key ? 'bg-white text-black' : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
                        <span style={{ color }}>{icon}</span>
            {name}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/20 rounded-full">
            <Paperclip className="w-5 h-5 text-white/80" />
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => addImages(e.target.files)} multiple accept="image/*" className="hidden" />
          <button onClick={isRecording ? stopRecording : startRecording} className={`p-2 hover:bg-white/20 rounded-full ${isRecording ? 'text-red-500' : 'text-white/80'}`}>
            <Mic className="w-5 h-5" />
          </button>
        </div>
        <div>
          <Button onClick={resetInputState} variant="ghost">Cancel</Button>
          <Button onClick={handleSubmit} className="ml-2 bg-white text-black">Submit</Button>
        </div>
      </div>
    </div>
  );
};
