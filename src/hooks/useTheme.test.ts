import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useTheme } from "./useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document class
    document.documentElement.className = "";
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("should initialize with light theme by default", () => {
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe("light");
    expect(result.current.isLoaded).toBe(true);
  });

  it("should initialize with dark theme when system prefers dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe("dark");
  });

  it("should use stored theme from localStorage", () => {
    localStorage.setItem("theme", "dark");
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe("dark");
  });

  it("should toggle theme from light to dark", () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("should toggle theme from dark to light", () => {
    localStorage.setItem("theme", "dark");
    
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("should apply dark class to document element when theme is dark", () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should remove dark class from document element when theme is light", () => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
    
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should persist theme preference in localStorage", () => {
    const { result } = renderHook(() => useTheme());
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(localStorage.getItem("theme")).toBe("dark");
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(localStorage.getItem("theme")).toBe("light");
  });
});

