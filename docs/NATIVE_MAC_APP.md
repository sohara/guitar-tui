# Native Mac App - Architecture Sketch

Future reference for porting the Guitar Practice TUI to a native macOS app using SwiftUI.

## Why Native?

- **Menu bar integration**: Show practice timer without app focus
- **Better UX**: Native feel, system shortcuts, notifications
- **Lightweight**: ~5MB vs 150MB+ Electron
- **Background operation**: Timer continues while practicing

## Framework Choice: SwiftUI

SwiftUI is the best fit because:
- Declarative (similar mental model to React)
- First-class `MenuBarExtra` support
- Modern, Apple's future direction
- Great for small focused apps

Alternatives considered:
- **Tauri**: Could reuse React skills, but menu bar requires native code anyway
- **AppKit**: More control but verbose, older paradigm
- **Electron**: Too heavy for this use case

## Feature Mapping

| TUI Feature | SwiftUI Equivalent |
|-------------|-------------------|
| Panes (Library, Sessions, Selected) | `NavigationSplitView` or custom `HSplitView` |
| List navigation | `List` with `selection` binding |
| Keyboard shortcuts | `.keyboardShortcut()` modifier |
| Search/filter | `Searchable` modifier |
| Practice timer | `TimelineView` + `MenuBarExtra` |
| Notion API | `URLSession` async/await |

## Architecture

```
GuitarPractice/
├── App/
│   ├── GuitarPracticeApp.swift      # Main app entry, menu bar setup
│   └── ContentView.swift            # Main window layout
├── Features/
│   ├── Library/
│   │   ├── LibraryView.swift
│   │   └── LibraryViewModel.swift
│   ├── Sessions/
│   │   ├── SessionsView.swift
│   │   └── SessionsViewModel.swift
│   ├── Selected/
│   │   ├── SelectedView.swift
│   │   └── SelectedViewModel.swift
│   └── Practice/
│       ├── PracticeView.swift       # Full-screen practice mode
│       ├── PracticeViewModel.swift
│       └── MenuBarTimer.swift       # Menu bar extra
├── Services/
│   ├── NotionClient.swift           # API calls
│   └── NotionTypes.swift            # Data models
├── Shared/
│   └── Config.swift                 # Database IDs, etc.
└── Resources/
    └── Assets.xcassets
```

## Key Components

### App Entry Point

```swift
import SwiftUI

@main
struct GuitarPracticeApp: App {
    @StateObject private var practiceState = PracticeState()

    var body: some Scene {
        // Main window
        WindowGroup {
            ContentView()
                .environmentObject(practiceState)
        }
        .commands {
            CommandGroup(replacing: .newItem) { }
            CommandMenu("Practice") {
                Button("Start Practice") { }
                    .keyboardShortcut("p", modifiers: .command)
            }
        }

        // Menu bar timer (shows when practicing)
        MenuBarExtra(isInserted: $practiceState.isActive) {
            MenuBarTimerView()
                .environmentObject(practiceState)
        } label: {
            Label(practiceState.formattedTime, systemImage: "guitars")
        }
    }
}
```

### Main Content View

```swift
struct ContentView: View {
    @StateObject private var library = LibraryViewModel()
    @StateObject private var sessions = SessionsViewModel()
    @StateObject private var selected = SelectedViewModel()
    @FocusState private var focusedPane: Pane?

    enum Pane { case library, sessions, selected }

    var body: some View {
        NavigationSplitView {
            // Library pane (primary)
            LibraryView(viewModel: library, selected: selected)
                .focused($focusedPane, equals: .library)
        } content: {
            // Sessions pane
            SessionsView(viewModel: sessions, selected: selected)
                .focused($focusedPane, equals: .sessions)
        } detail: {
            // Selected items pane
            SelectedView(viewModel: selected)
                .focused($focusedPane, equals: .selected)
        }
        .searchable(text: $library.searchQuery)
        .onAppear { focusedPane = .library }
        .onKeyPress { key in
            handleGlobalKeyPress(key)
        }
    }
}
```

### Library View

```swift
struct LibraryView: View {
    @ObservedObject var viewModel: LibraryViewModel
    @ObservedObject var selected: SelectedViewModel

    var body: some View {
        VStack(alignment: .leading) {
            // Sort options
            HStack {
                SortButton(label: "Name", field: .name, viewModel: viewModel)
                SortButton(label: "Last Practiced", field: .lastPracticed, viewModel: viewModel)
                SortButton(label: "Times Practiced", field: .timesPracticed, viewModel: viewModel)
            }
            .padding(.horizontal)

            // Item list
            List(viewModel.filteredItems, selection: $viewModel.selection) { item in
                LibraryItemRow(item: item, isSelected: selected.contains(item))
                    .onTapGesture(count: 2) {
                        selected.toggle(item)
                    }
            }
        }
        .navigationTitle("Library (\(viewModel.filteredItems.count))")
    }
}
```

### Menu Bar Timer

```swift
struct MenuBarTimerView: View {
    @EnvironmentObject var practiceState: PracticeState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Practicing")
                .font(.headline)
            Text(practiceState.currentItem?.name ?? "")
                .font(.subheadline)

            Divider()

            // Big timer display
            Text(practiceState.formattedTime)
                .font(.system(size: 32, weight: .bold, design: .monospaced))
                .frame(maxWidth: .infinity)

            Divider()

            HStack {
                Button(practiceState.isPaused ? "Resume" : "Pause") {
                    practiceState.togglePause()
                }
                .keyboardShortcut(.space, modifiers: [])

                Button("Finish") {
                    practiceState.requestFinish()
                }
                .keyboardShortcut(.return, modifiers: [])
            }

            Divider()

            Button("Cancel") {
                practiceState.cancel()
            }
        }
        .padding()
        .frame(width: 200)
    }
}
```

### Practice State (Shared)

```swift
@MainActor
class PracticeState: ObservableObject {
    @Published var isActive = false
    @Published var isPaused = false
    @Published var currentItem: SelectedItem?
    @Published var accumulatedSeconds: TimeInterval = 0
    @Published var isConfirming = false

    private var startTime: Date?
    private var timer: Timer?

    var formattedTime: String {
        let total = Int(accumulatedSeconds)
        let minutes = total / 60
        let seconds = total % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }

    func start(item: SelectedItem) {
        currentItem = item
        accumulatedSeconds = (item.actualMinutes ?? 0) * 60
        startTime = Date()
        isPaused = false
        isActive = true
        startTimer()
    }

    func togglePause() {
        if isPaused {
            startTime = Date()
            startTimer()
        } else {
            accumulateTime()
            timer?.invalidate()
        }
        isPaused.toggle()
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            self?.updateTime()
        }
    }

    private func updateTime() {
        guard let start = startTime, !isPaused else { return }
        // Update is automatic via published property
    }

    private func accumulateTime() {
        guard let start = startTime else { return }
        accumulatedSeconds += Date().timeIntervalSince(start)
    }
}
```

### Notion Client

```swift
actor NotionClient {
    private let apiKey: String
    private let baseURL = "https://api.notion.com/v1"

    init(apiKey: String) {
        self.apiKey = apiKey
    }

    func fetchLibrary() async throws -> [PracticeLibraryItem] {
        let url = URL(string: "\(baseURL)/databases/\(Config.libraryDatabaseId)/query")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("2022-06-28", forHTTPHeaderField: "Notion-Version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(NotionQueryResponse.self, from: data)
        return response.results.map { PracticeLibraryItem(from: $0) }
    }

    func updatePracticeLog(logId: String, actualTime: Double) async throws {
        // Similar pattern...
    }

    // ... other API methods
}
```

## Data Models

```swift
struct PracticeLibraryItem: Identifiable, Hashable {
    let id: String
    let name: String
    let type: ItemType?
    let artist: String?
    let lastPracticed: Date?
    let timesPracticed: Int?

    enum ItemType: String, CaseIterable {
        case song = "Song"
        case exercise = "Exercise"
        case courseLesson = "Course Lesson"
    }
}

struct PracticeSession: Identifiable {
    let id: String
    let name: String
    let date: Date
}

struct SelectedItem: Identifiable {
    let id: String
    let item: PracticeLibraryItem
    var plannedMinutes: Int
    var actualMinutes: Double?
    var logId: String?
}
```

## Implementation Phases

### Phase 1: Core UI (MVP)
- [ ] Basic three-pane layout
- [ ] Notion API integration (read library, sessions)
- [ ] Item selection and session building
- [ ] Save session to Notion

### Phase 2: Practice Mode
- [ ] Full-screen practice view
- [ ] Timer with pause/resume
- [ ] Save actual time to Notion

### Phase 3: Menu Bar
- [ ] MenuBarExtra with timer display
- [ ] Controls (pause, finish, cancel)
- [ ] Persist timer when window closed

### Phase 4: Polish
- [ ] Keyboard navigation throughout
- [ ] Sort/filter UI
- [ ] Settings (API key, database IDs)
- [ ] Local caching for offline browsing

## Resources

- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [MenuBarExtra](https://developer.apple.com/documentation/swiftui/menubarextra)
- [Notion API](https://developers.notion.com/)
- [Swift async/await](https://docs.swift.org/swift-book/LanguageGuide/Concurrency.html)

## Notes

- Store API key in Keychain, not in code
- Consider using SwiftData for local caching
- Menu bar icon could show progress (circular progress indicator)
- Could add system notifications when practice timer finishes
