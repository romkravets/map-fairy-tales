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
        <Button onClick={router.back} className={styles.btn}>
          <ArrowBackIosIcon style={{ fontSize: 10 }} /> Back
        </Button>
      ) : (
        <Link href={linkUrl} passHref>
          <Button className={styles.btn}>
            <ArrowBackIosIcon style={{ fontSize: 10 }} /> Back
          </Button>
        </Link>
      )}
    </div>
  );
};

export default BtnBack;
