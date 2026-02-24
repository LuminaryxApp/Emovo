"use client";

import type { GroupWithMembership } from "@emovo/shared";
import { Bell, Search, X, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { discoverGroupsApi } from "@/services/community.api";
import { getUnreadCountApi } from "@/services/notification.api";
import { useAuthStore } from "@/stores/auth.store";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [unreadCount, setUnreadCount] = useState(0);

  // Search state
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [groupResults, setGroupResults] = useState<GroupWithMembership[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch unread notifications
  useEffect(() => {
    async function fetchUnread() {
      try {
        const count = await getUnreadCountApi();
        setUnreadCount(count);
      } catch {
        // Ignore
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setGroupResults([]);
      setHasSearched(false);
      setIsDropdownOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { groups } = await discoverGroupsApi({ search: term.trim(), limit: 5 });
      setGroupResults(groups);
      setHasSearched(true);
      setIsDropdownOpen(true);
    } catch {
      setGroupResults([]);
      setHasSearched(true);
      setIsDropdownOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setGroupResults([]);
      setHasSearched(false);
      setIsDropdownOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        // On mobile, also close the search bar
        if (isSearchOpen && window.innerWidth < 768) {
          setIsSearchOpen(false);
          setQuery("");
          setGroupResults([]);
          setHasSearched(false);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSearchOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setQuery("");
          setGroupResults([]);
          setHasSearched(false);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  // Focus input when mobile search opens
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setIsDropdownOpen(false);
    setQuery("");
    setGroupResults([]);
    setHasSearched(false);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-end gap-4 border-b border-border-default bg-surface/80 px-6 backdrop-blur-sm">
      {/* Search — Desktop: always visible inline input */}
      <div ref={searchRef} className="relative mr-auto flex items-center">
        {/* Desktop search input (always visible) */}
        <div className="relative hidden md:block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (hasSearched && query.trim()) setIsDropdownOpen(true);
            }}
            placeholder="Search groups..."
            className="h-9 w-64 rounded-[var(--radius-md)] border border-border-default bg-input-bg pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/30"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setGroupResults([]);
                setHasSearched(false);
                setIsDropdownOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-tertiary transition-colors hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Mobile search icon + expandable input */}
        <div className="md:hidden">
          {!isSearchOpen ? (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              <Search size={20} />
            </button>
          ) : (
            <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-2 border-b border-border-default bg-surface px-4">
              <Search size={16} className="shrink-0 text-text-tertiary" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Search groups..."
                className="h-9 flex-1 rounded-[var(--radius-md)] border border-border-default bg-input-bg px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green/30"
                autoFocus
              />
              <button
                onClick={closeSearch}
                className="shrink-0 rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Search results dropdown */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-md)] border border-border-default bg-surface shadow-lg md:w-96">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-text-tertiary">
                <Loader2 size={16} className="animate-spin" />
                Searching...
              </div>
            ) : hasSearched && groupResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-text-tertiary">
                No results found
              </div>
            ) : (
              <>
                {groupResults.length > 0 && (
                  <div>
                    <div className="border-b border-border-light px-4 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                        Groups
                      </span>
                    </div>
                    <ul>
                      {groupResults.map((group) => (
                        <li key={group.id}>
                          <Link
                            href="/community"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setIsSearchOpen(false);
                              setQuery("");
                              setGroupResults([]);
                              setHasSearched(false);
                            }}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-elevated"
                          >
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
                              style={{
                                background: `linear-gradient(135deg, ${group.gradientStart}, ${group.gradientEnd})`,
                              }}
                            >
                              {group.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-text-primary">
                                {group.name}
                              </p>
                              <p className="flex items-center gap-1 text-xs text-text-tertiary">
                                <Users size={12} />
                                {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>

      {/* User avatar */}
      <Link href="/profile" className="flex items-center gap-2">
        <Avatar src={user?.avatarBase64} name={user?.displayName || "User"} size="sm" />
      </Link>
    </header>
  );
}
