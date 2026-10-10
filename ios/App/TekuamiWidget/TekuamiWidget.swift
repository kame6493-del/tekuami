import SwiftUI
import WidgetKit

/// てくあみのウィジェット(見本D 下段左)。
/// ホーム画面: 小 = 円で 287 / 500、中 = 編み地の絵と「次の段まで あと287歩」「今日 3,214歩」
/// ロック画面: 丸(円の進み)・四角(次の段まで)・1行
@main
struct TekuamiWidgetBundle: WidgetBundle {
    var body: some Widget {
        TekuamiWidget()
    }
}

struct TekuamiEntry: TimelineEntry {
    let date: Date
    let snap: TekuamiShared.Snapshot
}

struct TekuamiProvider: TimelineProvider {
    func placeholder(in context: Context) -> TekuamiEntry {
        TekuamiEntry(date: Date(), snap: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (TekuamiEntry) -> Void) {
        let s = TekuamiShared.read()
        completion(TekuamiEntry(date: Date(), snap: context.isPreview && s.item.isEmpty ? .sample : s))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TekuamiEntry>) -> Void) {
        // 歩数はアプリが読んだときに書き換わる。1時間ごとにも出し直す
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [TekuamiEntry(date: Date(), snap: TekuamiShared.read())], policy: .after(next)))
    }
}

struct TekuamiWidget: Widget {
    let kind = "TekuamiWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TekuamiProvider()) { entry in
            TekuamiWidgetView(snap: entry.snap)
        }
        .configurationDisplayName("てくあみ")
        .description("次の段まで、あと何歩。")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

private let paper = Color(red: 0.984, green: 0.953, blue: 0.902)
private let ink = Color(red: 0.353, green: 0.212, blue: 0.141)
private let arcColor = Color(red: 0.851, green: 0.565, blue: 0.353)
private let arcBg = Color(red: 0.918, green: 0.875, blue: 0.812)
private let night = Color(red: 0.173, green: 0.208, blue: 0.322)
private let light = Color(red: 1.0, green: 0.97, blue: 0.93)

private func bg(_ s: TekuamiShared.Snapshot) -> Color { s.theme == "yoru" ? night : paper }
private func fg(_ s: TekuamiShared.Snapshot) -> Color { s.theme == "yoru" ? light : ink }

struct TekuamiWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let snap: TekuamiShared.Snapshot

    var body: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: snap.frac) {
                Text("歩")
            } currentValueLabel: {
                Text("\(snap.toNext)").font(.system(size: 15, weight: .bold).monospacedDigit())
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .containerBackground(for: .widget) { AccessoryWidgetBackground() }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text(snap.item.isEmpty ? "てくあみ" : "次の段まで")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                Text(snap.item.isEmpty ? "次に編むものを選ぶ" : "あと \(snap.toNext) 歩")
                    .font(.system(size: 17, weight: .bold).monospacedDigit())
                Text("今日 \(snap.today) 歩")
                    .font(.system(size: 12).monospacedDigit())
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .containerBackground(for: .widget) { AccessoryWidgetBackground() }
        case .accessoryInline:
            Text(snap.item.isEmpty ? "てくあみ" : "次の段まで あと\(snap.toNext)歩")
                .containerBackground(for: .widget) { Color.clear }
        case .systemMedium:
            MediumView(snap: snap)
                .containerBackground(for: .widget) { bg(snap) }
        default:
            SmallView(snap: snap)
                .containerBackground(for: .widget) { bg(snap) }
        }
    }
}

/// 小: 円で残り歩数(見本D の 287 / 500)
struct SmallView: View {
    let snap: TekuamiShared.Snapshot

    var body: some View {
        ZStack {
            Circle()
                .trim(from: 0.12, to: 0.88)
                .stroke(arcBg, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(90))
            Circle()
                .trim(from: 0.12, to: 0.12 + 0.76 * snap.frac)
                .stroke(arcColor, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(90))
            VStack(spacing: 0) {
                Text("あと")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(fg(snap).opacity(0.7))
                Text("\(snap.toNext)")
                    .font(.system(size: 34, weight: .bold).monospacedDigit())
                    .foregroundStyle(fg(snap))
                    .minimumScaleFactor(0.6)
                Text("/\(snap.rowSteps)")
                    .font(.system(size: 13, weight: .semibold).monospacedDigit())
                    .foregroundStyle(fg(snap).opacity(0.7))
            }
        }
        .padding(6)
    }
}

/// 中: 編み地の絵と、次の段まで・今日の歩数
struct MediumView: View {
    let snap: TekuamiShared.Snapshot

    var body: some View {
        HStack(spacing: 14) {
            Image("WidgetMuffler")
                .resizable()
                .scaledToFit()
                .clipShape(RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 4) {
                Text(snap.item.isEmpty ? "次に編むものを選ぶ" : "次の段まで")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(fg(snap).opacity(0.75))
                if !snap.item.isEmpty {
                    HStack(alignment: .firstTextBaseline, spacing: 3) {
                        Text("あと").font(.system(size: 15, weight: .bold))
                        Text("\(snap.toNext)").font(.system(size: 36, weight: .bold).monospacedDigit())
                        Text("歩").font(.system(size: 15, weight: .bold))
                    }
                    .foregroundStyle(fg(snap))
                }
                Text("今日 \(snap.today) 歩")
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                    .foregroundStyle(fg(snap).opacity(0.75))
            }
            Spacer(minLength: 0)
        }
    }
}
