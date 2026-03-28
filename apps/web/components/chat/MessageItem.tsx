type Props = {
  text: string;
};

export default function MessageItem({ text }: Props) {
  return <div style={{ padding: "5px 0" }}>{text}</div>;
}