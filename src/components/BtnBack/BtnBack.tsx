import Link from "next/link";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";

interface BtnBackProps {
  linkUrl: string;
}

const BtnBack = ({ linkUrl }: BtnBackProps) => {
  const router = useRouter();

  return (
    <div className="sub-header">
      {linkUrl === "back" ? (
        <Button onClick={router.back}>
          <ArrowBackIosIcon style={{ fontSize: 10 }} /> Back
        </Button>
      ) : (
        <Link href={linkUrl} passHref>
          <Button>
            <ArrowBackIosIcon style={{ fontSize: 10 }} /> Back
          </Button>
        </Link>
      )}
    </div>
  );
};

export default BtnBack;
