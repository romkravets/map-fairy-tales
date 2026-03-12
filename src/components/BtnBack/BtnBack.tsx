import Link from "next/link";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import styles from "./BtnBack.module.css";

interface BtnBackProps {
  linkUrl: string;
}

const BtnBack = ({ linkUrl }: BtnBackProps) => {
  const router = useRouter();

  return (
    <div className="sub-header">
      {linkUrl === "back" ? (
        <Button
          onClick={router.back}
          className={styles.btn}
          aria-label="Go back to previous page"
        >
          <ArrowBackIosIcon style={{ fontSize: 10 }} aria-hidden="true" /> Back
        </Button>
      ) : (
        <Link href={linkUrl} passHref>
          <Button className={styles.btn} aria-label="Go back">
            <ArrowBackIosIcon style={{ fontSize: 10 }} aria-hidden="true" />{" "}
            Back
          </Button>
        </Link>
      )}
    </div>
  );
};

export default BtnBack;
