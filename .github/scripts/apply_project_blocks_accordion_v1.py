from pathlib import Path

path = Path("frontend/src/app/proje-satis-sablonu/page.tsx")
text = path.read_text(encoding="utf-8")


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
'''  const previewing = busyAction === "structure-preview";
  const applying = busyAction === "structure-apply";
  const totalFloorCount = blocks.reduce(''',
'''  const previewing = busyAction === "structure-preview";
  const applying = busyAction === "structure-apply";
  const [expandedBlockKey, setExpandedBlockKey] = useState<string | null>(
    blocks[0]?.key ?? null,
  );

  useEffect(() => {
    setExpandedBlockKey((current) => {
      if (current && blocks.some((block) => block.key === current)) {
        return current;
      }

      return blocks[0]?.key ?? null;
    });
  }, [blocks]);

  const totalFloorCount = blocks.reduce(''',
"accordion state",
)

replace_once(
'''          const floors = buildFloors(block);

          return (
            <section key={block.key} style={{ ...cardStyle, padding: 13 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr) 42px",
                  alignItems: "center",
                  gap: 9,
                }}
              >''',
'''          const floors = buildFloors(block);
          const expanded = expandedBlockKey === block.key;
          const accordionContentId = `project-block-${block.key}-content`;

          return (
            <section
              key={block.key}
              style={{
                ...cardStyle,
                padding: 0,
                overflow: "hidden",
                borderColor: expanded ? "#93C5FD" : "#C7D6E8",
                boxShadow: expanded
                  ? "0 12px 30px rgba(37, 99, 235, 0.12)"
                  : cardStyle.boxShadow,
              }}
            >
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                aria-controls={accordionContentId}
                onClick={() =>
                  setExpandedBlockKey((current) =>
                    current === block.key ? null : block.key,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedBlockKey((current) =>
                      current === block.key ? null : block.key,
                    );
                  }
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px minmax(0, 1fr) 42px 42px",
                  alignItems: "center",
                  gap: 9,
                  padding: 13,
                  background: expanded ? "#F8FBFF" : "#FFFFFF",
                  cursor: "pointer",
                  outline: "none",
                }}
              >''',
"accordion header",
)

replace_once(
'''                <button
                  type="button"
                  onClick={() => onRemoveBlock(block.key)}
                  disabled={blocks.length === 1 || Boolean(busyAction)}''',
'''                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveBlock(block.key);
                  }}
                  disabled={blocks.length === 1 || Boolean(busyAction)}''',
"delete propagation",
)

replace_once(
'''                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div
                style={{''',
'''                >
                  <Trash2 size={17} />
                </button>

                <div
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 42,
                    border: "1.5px solid #BFDBFE",
                    borderRadius: 13,
                    display: "grid",
                    placeItems: "center",
                    background: "#EFF6FF",
                    color: "#1557D6",
                  }}
                >
                  <ChevronDown
                    size={19}
                    style={{
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 180ms ease",
                    }}
                  />
                </div>
              </div>

              {expanded && (
                <div
                  id={accordionContentId}
                  style={{
                    padding: "0 13px 13px",
                    borderTop: "1px solid #DBEAFE",
                    background: "#FFFFFF",
                  }}
                >
              <div
                style={{''',
"accordion content open",
)

replace_once(
'''              </div>
            </section>
          );
        })}''',
'''              </div>
                </div>
              )}
            </section>
          );
        })}''',
"accordion content close",
)

replace_once(
'''  const addBlock = () => {
    setBlocks((current) => {
      const usedCodes = new Set(''',
'''  const addBlock = () => {
    setBlocks((current) => {
      const usedCodes = new Set(''',
"add block anchor",
)

# New blocks should become visible immediately. Update the existing return block.
replace_once(
'''      return [
        ...current,
        createBlockForm(
          nextIndex,
          structureProject?.geometryType || "DIKDORTGEN",
        ),
      ];''',
'''      const nextBlock = createBlockForm(
        nextIndex,
        structureProject?.geometryType || "DIKDORTGEN",
      );

      window.setTimeout(() => setExpandedBlockKey(nextBlock.key), 0);

      return [...current, nextBlock];''',
"expand new block",
)

path.write_text(text, encoding="utf-8")
print("Project Blocks Accordion V1 applied")
